import type { BoolQuery } from '@kbn/es-query';
import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { RollupInterval } from '../../../common/rollup';
import type { Coordinate } from '../../../typings/timeseries';
import type { APMEventClient } from '../helpers/create_es_client/create_apm_event_client';
export declare function getFailedTransactionRate({ environment, kuery, filters, serviceName, transactionTypes, transactionName, apmEventClient, start, end, offset, documentType, rollupInterval, bucketSizeInSeconds, }: {
    environment: string;
    kuery: string;
    filters?: BoolQuery;
    serviceName: string;
    transactionTypes: string[];
    transactionName?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    offset?: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
}): Promise<{
    timeseries: Coordinate[];
    average: number | null;
}>;
