import type { APMConfig } from '../../..';
import type { ApmTransactionDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { GenericMetricsChart } from '../fetch_and_transform_metrics';
export declare function getServerlessFunctionLatencyChart({ environment, kuery, config, apmEventClient, serviceName, start, end, serverlessId, documentType, rollupInterval, bucketSizeInSeconds, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
    documentType: ApmTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
}): Promise<GenericMetricsChart>;
