import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Invoice } from '../../entities/invoice.entity';
import { Repository } from 'typeorm';
import { InvoiceStatus } from 'src/entities/invoiceStatus.entity';
import { UserEntity } from 'src/entities/user.entity';

@Injectable()
export class InvoicesService {      
    constructor(
        @InjectRepository(Invoice)
        private invoiceRepository: Repository<Invoice>,
        @InjectRepository(Invoice)
        private userRepository: Repository<UserEntity>,
        @InjectRepository(Invoice)
        private invoiceStatusRepository: Repository<InvoiceStatus>,
        
    ){}
    async createInvoice(createDeliverableDto
    ){
        const {
            invoiceNumber,
            path,
            issueDate,
            dueDate,
            amount,
            userId,
            invoiceStatusId
        } = createDeliverableDto
        const invoiceStatus = await this.invoiceStatusRepository.findOneBy({id:invoiceStatusId})

        const user = await this.userRepository.findOneBy({id:userId})

        if(!invoiceStatus || !user){
          throw new Error('invoiceStatus or user not found')
        }
    
        const invoice = this.invoiceRepository.create({
            "number": invoiceNumber,
            path,
            issueDate,
            dueDate,
            amount,
            user,
            invoiceStatus
        })
        
        const result = this.invoiceRepository.save(invoice);
        return result;
    }

    async getInvoicesByUser(
        userId: number = null, 
        idsInvoiceStatus: number[],
        page:number=1, pageSize: number=10
    ): Promise<Invoice[]> {

        const offset = (page - 1) * pageSize
        
        const queryBuilder = this.invoiceRepository
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.invoiceStatus', 'invoiceStatus')
        .leftJoinAndSelect('invoice.user', 'users')
        .select([
            'invoice.id AS "id"',
            'invoice.path AS "invoicePath"',
            'invoice.number AS "invoiceNumber"',
            `TO_CHAR(invoice.issueDate, 'DD-MM-YYYY') AS "invoiceIssueDate"`,
            `TO_CHAR(invoice.dueDate, 'DD-MM-YYYY') AS "invoiceDueDate"`,
            'invoice.amount AS "invoiceAmount"',
            'invoiceStatus.name AS "invoiceStatus"',
            `CASE 
                WHEN invoice.dueDate < CURRENT_DATE THEN true 
                ELSE false 
             END AS "overdueIndicator"`
        ])
        .orderBy('"invoiceDueDate"', 'DESC')  
        .limit(pageSize)
        .offset(offset)

        if(idsInvoiceStatus){
            queryBuilder.where('invoiceStatus.id IN (:...statusIds)', { statusIds: idsInvoiceStatus }) // Maneja el array de IDs
        }

        if (userId) {
            queryBuilder.where('users.id = :userId', { userId });
        }
        const result = await queryBuilder.getRawMany();
        
        return result;

    }
}