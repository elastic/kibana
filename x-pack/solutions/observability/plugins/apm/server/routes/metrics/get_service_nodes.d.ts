import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type ServiceNodesResponse = Array<{
    name: string;
    cpu: number | null;
    heapMemory: number | null;
    hostName: string | null | undefined;
    nonHeapMemory: number | null;
    threadCount: number | null;
}>;
declare function getServiceNodes({ kuery, apmEventClient, serviceName, environment, start, end, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    environment: string;
    start: number;
    end: number;
}): Promise<ServiceNodesResponse>;
export { getServiceNodes };
