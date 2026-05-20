import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { RollupInterval } from '../../../common/rollup';
export interface ServiceNodeMetadataResponse {
    host: string | number;
    containerId: string | number;
}
export declare function getServiceNodeMetadata({ kuery, serviceName, serviceNodeName, apmEventClient, start, end, environment, documentType, rollupInterval, }: {
    kuery: string;
    serviceName: string;
    serviceNodeName: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    environment: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
}): Promise<ServiceNodeMetadataResponse>;
