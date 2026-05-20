import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RollupInterval } from '../../../common/rollup';
export interface ServiceTransactionTypesResponse {
    transactionTypes: string[];
}
export declare function getServiceTransactionTypes({ apmEventClient, serviceName, start, end, documentType, rollupInterval, }: {
    serviceName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
}): Promise<ServiceTransactionTypesResponse>;
