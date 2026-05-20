import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getOTelSystemCPUChartDataForJava({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, start, end, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
}): Promise<import("../../../fetch_and_transform_metrics").FetchAndTransformMetrics>;
