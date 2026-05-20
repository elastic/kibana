import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const systemMemory: {
    filter: {
        bool: {
            filter: {
                exists: {
                    field: string;
                };
            }[];
        };
    };
    script: {
        lang: string;
        source: string;
    };
};
export declare const cgroupMemory: {
    filter: {
        bool: {
            filter: {
                exists: {
                    field: string;
                };
            }[];
            should: {
                exists: {
                    field: string;
                };
            }[];
            minimum_should_match: number;
        };
    };
    script: {
        lang: string;
        source: string;
    };
};
export declare function getMemoryChartData({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, serverlessId, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    serverlessId?: string;
    start: number;
    end: number;
    isOpenTelemetry?: boolean;
}): Promise<import("../../../fetch_and_transform_metrics").FetchAndTransformMetrics>;
