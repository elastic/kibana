import type { TimeRangeMetadata } from '../../../common';
import type { ApmDataAccessServicesParams } from '../get_services';
export interface HostServicesRequest {
    filters: Record<string, string>;
    start: number;
    end: number;
    size?: number;
    documentSources: TimeRangeMetadata['sources'];
}
export declare function createGetHostServices({ apmEventClient }: ApmDataAccessServicesParams): ({ start, end, size, filters, documentSources }: HostServicesRequest) => Promise<{
    services: {
        serviceName: string;
        agentName: string | null;
    }[];
}>;
