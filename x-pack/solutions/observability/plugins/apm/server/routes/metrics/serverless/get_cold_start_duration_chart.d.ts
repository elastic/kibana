import type { APMConfig } from '../../..';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getColdStartDurationChart({ environment, kuery, config, apmEventClient, serviceName, start, end, serverlessId, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    start: number;
    end: number;
    serverlessId?: string;
}): Promise<{
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
}>;
