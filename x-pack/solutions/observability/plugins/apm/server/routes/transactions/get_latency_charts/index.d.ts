import type { BoolQuery } from '@kbn/es-query';
import type { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { RollupInterval } from '../../../../common/rollup';
import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getLatencyTimeseries({ environment, kuery, filters, serviceName, transactionType, transactionName, apmEventClient, latencyAggregationType, start, end, offset, serverlessId, documentType, rollupInterval, bucketSizeInSeconds, useDurationSummary, }: {
    environment: string;
    kuery: string;
    filters?: BoolQuery;
    serviceName: string;
    transactionType?: string;
    transactionName?: string;
    apmEventClient: APMEventClient;
    latencyAggregationType: LatencyAggregationType;
    start: number;
    end: number;
    offset?: string;
    serverlessId?: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
    useDurationSummary?: boolean;
}): Promise<{
    overallAvgDuration: number | null;
    latencyTimeseries: {
        x: number;
        y: number | null;
    }[];
}>;
export interface TransactionLatencyResponse {
    currentPeriod: {
        overallAvgDuration: number | null;
        latencyTimeseries: Coordinate[];
    };
    previousPeriod: {
        overallAvgDuration: number | null;
        latencyTimeseries: Coordinate[];
    };
}
export declare function getLatencyPeriods({ serviceName, transactionType, transactionName, apmEventClient, latencyAggregationType, kuery, filters, environment, start, end, offset, documentType, rollupInterval, bucketSizeInSeconds, useDurationSummary, }: {
    serviceName: string;
    transactionType: string | undefined;
    transactionName: string | undefined;
    apmEventClient: APMEventClient;
    latencyAggregationType: LatencyAggregationType;
    kuery: string;
    filters?: BoolQuery;
    environment: string;
    start: number;
    end: number;
    offset?: string;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
    useDurationSummary?: boolean;
}): Promise<TransactionLatencyResponse>;
