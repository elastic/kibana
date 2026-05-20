import type { APMConfig } from '../../..';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getColdStartCountChart({ environment, kuery, config, apmEventClient, serviceName, start, end, serverlessId, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
}): Promise<import("../fetch_and_transform_metrics").FetchAndTransformMetrics>;
