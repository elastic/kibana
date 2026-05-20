import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMInternalESClient } from '../../../../lib/helpers/create_es_client/create_internal_es_client';
export type EnvironmentsResponse = Array<{
    name: string;
    alreadyConfigured: boolean;
}>;
export declare function getEnvironments({ serviceName, internalESClient, apmEventClient, searchAggregatedTransactions, size, }: {
    serviceName: string | undefined;
    internalESClient: APMInternalESClient;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    size: number;
}): Promise<EnvironmentsResponse>;
