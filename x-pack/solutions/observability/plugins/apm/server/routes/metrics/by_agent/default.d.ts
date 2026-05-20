import type { APMConfig } from '../../..';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getDefaultMetricsCharts({ environment, kuery, serviceName, config, apmEventClient, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    isOpenTelemetry: boolean;
}): Promise<[import("../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../fetch_and_transform_metrics").FetchAndTransformMetrics]>;
