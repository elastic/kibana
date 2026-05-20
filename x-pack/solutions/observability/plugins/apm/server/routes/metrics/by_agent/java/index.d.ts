import type { APMConfig } from '../../../..';
import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getJavaMetricsCharts({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
    isOpenTelemetry: boolean;
}): Promise<[import("../../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../../fetch_and_transform_metrics").FetchAndTransformMetrics, {
    series: {
        title: string;
        key: string;
        type: import("@kbn/apm-types").ChartType;
        overallValue: number;
        data: {
            y: number | null;
            x: number;
        }[];
    }[];
    title: string;
    key: string;
    type: import("@kbn/apm-types").ChartType;
    yUnit: import("@kbn/apm-types").YUnit;
    description?: string;
}, {
    series: {
        title: string;
        key: string;
        type: import("@kbn/apm-types").ChartType;
        overallValue: number;
        data: {
            y: number | null;
            x: number;
        }[];
    }[];
    title: string;
    key: string;
    type: import("@kbn/apm-types").ChartType;
    yUnit: import("@kbn/apm-types").YUnit;
    description?: string;
}]>;
