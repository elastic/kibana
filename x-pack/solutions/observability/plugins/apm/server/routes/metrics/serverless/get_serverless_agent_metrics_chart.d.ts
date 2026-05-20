import type { APMConfig } from '../../..';
import type { ApmTransactionDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getServerlessAgentMetricsCharts({ environment, kuery, config, apmEventClient, serviceName, start, end, serverlessId, documentType, rollupInterval, bucketSizeInSeconds, }: {
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
}): Promise<[import("../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../fetch_and_transform_metrics").FetchAndTransformMetrics, {
    series: {
        overallValue: number;
        data: {
            x: number;
            y: number | null | undefined;
        }[];
        title: string;
        key: string;
        type: import("@kbn/apm-types").ChartType;
    }[];
    title: string;
    key: string;
    yUnit: import("@kbn/apm-types").YUnit;
    description?: string;
}, import("../fetch_and_transform_metrics").FetchAndTransformMetrics, import("../fetch_and_transform_metrics").FetchAndTransformMetrics]>;
