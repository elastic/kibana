import type { ApmPluginRequestHandlerContext } from '../typings';
import type { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type StorageExplorerServiceStatisticsResponse = Array<{
    serviceName: string;
    sampling: number;
    environments: string[];
    size: number;
    agentName: AgentName;
}>;
export declare function getServiceStatistics({ apmEventClient, context, indexLifecyclePhase, randomSampler, start, end, environment, kuery, searchAggregatedTransactions, }: {
    apmEventClient: APMEventClient;
    context: ApmPluginRequestHandlerContext;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    searchAggregatedTransactions: boolean;
}): Promise<StorageExplorerServiceStatisticsResponse>;
