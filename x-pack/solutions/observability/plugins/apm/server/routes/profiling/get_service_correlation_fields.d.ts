import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getServiceCorrelationFields({ apmEventClient, serviceName, start, end, environment, documentType, rollupInterval, }: {
    environment: string;
    serviceName: string;
    start: number;
    end: number;
    apmEventClient: APMEventClient;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
}): Promise<{
    hostNames: string[];
    containerIds: string[];
}>;
