import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getCPUChartData({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
    isOpenTelemetry?: boolean;
}): Promise<import("../../../fetch_and_transform_metrics").FetchAndTransformMetrics>;
