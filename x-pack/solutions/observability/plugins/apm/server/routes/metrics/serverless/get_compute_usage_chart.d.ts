import type { APMConfig } from '../../..';
import type { GenericMetricsChart } from '../fetch_and_transform_metrics';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const computeUsageAvgScript: {
    avg: {
        script: string;
    };
};
export declare function getComputeUsageChart({ environment, kuery, config, apmEventClient, serviceName, start, end, serverlessId, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
}): Promise<GenericMetricsChart>;
