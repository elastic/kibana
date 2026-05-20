import type { NodeStats } from '../../../common/service_map';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Options {
    apmEventClient: APMEventClient;
    environment: string;
    dependencies: string[];
    sourceServiceName?: string;
    start: number;
    end: number;
    offset?: string;
}
export interface ServiceMapServiceDependencyInfoResponse {
    currentPeriod: NodeStats;
    previousPeriod: NodeStats | undefined;
}
export declare function getServiceMapDependencyNodeInfo({ apmEventClient, dependencies, sourceServiceName, start, end, environment, offset, }: Options): Promise<ServiceMapServiceDependencyInfoResponse>;
export {};
