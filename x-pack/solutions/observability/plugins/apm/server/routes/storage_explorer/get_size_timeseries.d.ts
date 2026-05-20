import type { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type SizeTimeseriesResponse = Array<{
    serviceName: string;
    timeseries: Array<{
        x: number;
        y: number;
    }>;
}>;
export declare function getSizeTimeseries({ environment, kuery, apmEventClient, searchAggregatedTransactions, start, end, indexLifecyclePhase, randomSampler, context, }: {
    environment: string;
    kuery: string;
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    context: ApmPluginRequestHandlerContext;
}): Promise<SizeTimeseriesResponse>;
