import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */
export declare function getEnvironments({ searchAggregatedTransactions, serviceName, apmEventClient, size, start, end, }: {
    apmEventClient: APMEventClient;
    serviceName?: string;
    searchAggregatedTransactions: boolean;
    size: number;
    start: number;
    end: number;
}): Promise<Environment[]>;
