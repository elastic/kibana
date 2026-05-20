import type { NodeStats } from '../../../common/service_map';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface Options {
    apmEventClient: APMEventClient;
    environment: string;
    serviceName: string;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    offset?: string;
}
export interface ServiceMapServiceNodeInfoResponse {
    currentPeriod: NodeStats;
    previousPeriod: NodeStats | undefined;
}
export declare function getServiceMapServiceNodeInfo({ environment, apmEventClient, serviceName, searchAggregatedTransactions, start, end, offset, }: Options): Promise<ServiceMapServiceNodeInfoResponse>;
export {};
