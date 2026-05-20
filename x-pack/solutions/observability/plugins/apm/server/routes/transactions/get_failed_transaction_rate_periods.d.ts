import type { BoolQuery } from '@kbn/es-query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { Coordinate } from '../../../typings/timeseries';
import type { ApmServiceTransactionDocumentType } from '../../../common/document_type';
import type { RollupInterval } from '../../../common/rollup';
export interface FailedTransactionRateResponse {
    currentPeriod: {
        timeseries: Coordinate[];
        average: number | null;
    };
    previousPeriod: {
        timeseries: Coordinate[];
        average: number | null;
    };
}
export declare function getFailedTransactionRatePeriods({ environment, kuery, filters, serviceName, transactionType, transactionName, apmEventClient, start, end, offset, documentType, rollupInterval, bucketSizeInSeconds, }: {
    environment: string;
    kuery: string;
    filters?: BoolQuery;
    serviceName: string;
    transactionType: string;
    transactionName?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    offset?: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
}): Promise<FailedTransactionRateResponse>;
