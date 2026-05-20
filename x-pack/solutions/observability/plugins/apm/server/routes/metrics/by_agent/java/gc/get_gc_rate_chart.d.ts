import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
declare function getGcRateChart({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
    isOpenTelemetry?: boolean;
}): Promise<{
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
}>;
export { getGcRateChart };
