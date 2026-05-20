import type { ApmPluginRequestHandlerContext } from '../typings';
import type { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
interface SharedOptions {
    apmEventClient: APMEventClient;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    start: number;
    end: number;
    environment: string;
    kuery: string;
}
type TracesPerMinuteOptions = SharedOptions & {
    searchAggregatedTransactions: boolean;
};
type MainSummaryStatsOptions = SharedOptions & {
    context: ApmPluginRequestHandlerContext;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
};
export interface StorageExplorerSummaryStatisticsResponse {
    tracesPerMinute: number;
    totalSize: number;
    diskSpaceUsedPct: number;
    numberOfServices: number;
    estimatedIncrementalSize: number;
    dailyDataGeneration: number;
}
export declare function getSummaryStatistics({ apmEventClient, context, start, end, environment, kuery, randomSampler, indexLifecyclePhase, searchAggregatedTransactions, }: TracesPerMinuteOptions & MainSummaryStatsOptions): Promise<StorageExplorerSummaryStatisticsResponse>;
export {};
