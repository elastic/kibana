import type { ApmServiceTransactionDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
export interface ServiceTransactionDetailedStat {
    serviceName: string;
    latency: Array<{
        x: number;
        y: number | null;
    }>;
    transactionErrorRate?: Array<{
        x: number;
        y: number | null;
    }>;
    throughput?: Array<{
        x: number;
        y: number | null;
    }>;
}
export declare function getServiceTransactionDetailedStats({ serviceNames, environment, kuery, apmEventClient, documentType, rollupInterval, bucketSizeInSeconds, offset, start, end, randomSampler, }: {
    serviceNames: string[];
    environment: string;
    kuery: string;
    apmEventClient: APMEventClient;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
    offset?: string;
    start: number;
    end: number;
    randomSampler: RandomSampler;
}): Promise<import("lodash").Dictionary<{
    serviceName: string;
    latency: {
        x: number;
        y: number | null;
    }[];
    transactionErrorRate: {
        x: number;
        y: number | null;
    }[] | undefined;
    throughput: {
        x: number;
        y: number | null;
    }[];
}>>;
export interface ServiceTransactionDetailedStatPeriodsResponse {
    currentPeriod: Record<string, ServiceTransactionDetailedStat>;
    previousPeriod: Record<string, ServiceTransactionDetailedStat>;
}
export declare function getServiceTransactionDetailedStatsPeriods({ serviceNames, environment, kuery, apmEventClient, documentType, rollupInterval, bucketSizeInSeconds, offset, start, end, randomSampler, }: {
    serviceNames: string[];
    environment: string;
    kuery: string;
    apmEventClient: APMEventClient;
    documentType: ApmServiceTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
    offset?: string;
    start: number;
    end: number;
    randomSampler: RandomSampler;
}): Promise<ServiceTransactionDetailedStatPeriodsResponse>;
