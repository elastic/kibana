import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Props {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
    field: string;
}
export interface MobileMainStatisticsResponse {
    mainStatistics: Array<{
        name: string | number;
        latency: number | null;
        throughput: number;
        crashRate: number;
    }>;
}
export declare function getMobileMainStatisticsByField({ kuery, apmEventClient, serviceName, environment, start, end, field, }: Props): Promise<{
    mainStatistics: {
        name: string | number;
        latency: number | null;
        throughput: number;
        crashRate: number;
    }[];
}>;
export {};
