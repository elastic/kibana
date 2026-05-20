import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTotalTransactionsPerService({ apmEventClient, searchAggregatedTransactions, indexLifecyclePhase, randomSampler, start, end, environment, kuery, }: {
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    start: number;
    end: number;
    environment: string;
    kuery: string;
}): Promise<Record<string, number>>;
