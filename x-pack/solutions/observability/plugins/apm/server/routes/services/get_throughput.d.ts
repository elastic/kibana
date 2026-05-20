import type { BoolQuery } from '@kbn/es-query';
import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Maybe } from '../../../typings/common';
interface Options {
    environment: string;
    kuery: string;
    filters?: BoolQuery;
    serviceName: string;
    apmEventClient: APMEventClient;
    transactionType?: string;
    transactionName?: string;
    start: number;
    end: number;
    offset?: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
}
export type ServiceThroughputResponse = Array<{
    x: number;
    y: Maybe<number>;
}>;
export declare function getThroughput({ environment, kuery, filters, serviceName, apmEventClient, transactionType, transactionName, start, end, offset, documentType, rollupInterval, bucketSizeInSeconds, }: Options): Promise<ServiceThroughputResponse>;
export {};
