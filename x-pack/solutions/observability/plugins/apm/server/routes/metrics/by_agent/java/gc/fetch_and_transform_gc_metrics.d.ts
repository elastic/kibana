import type { ChartBase } from '../../../types';
import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const RATE = "rate";
export declare const TIME = "time";
export declare function fetchAndTransformGcMetrics({ environment, kuery, config, apmEventClient, serviceName, serviceNodeName, chartBase, rateOrTime, operationName, start, end, isOpenTelemetry, }: {
    environment: string;
    kuery: string;
    config: APMConfig;
    apmEventClient: APMEventClient;
    serviceName: string;
    serviceNodeName?: string;
    start: number;
    end: number;
    chartBase: ChartBase;
    rateOrTime: typeof RATE | typeof TIME;
    operationName: string;
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
