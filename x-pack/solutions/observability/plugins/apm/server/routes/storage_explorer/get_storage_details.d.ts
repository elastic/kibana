import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { Environment } from '../../../common/environment_rt';
import type { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { ApmPluginRequestHandlerContext } from '../typings';
export interface StorageDetailsResponse {
    processorEventStats: Array<{
        processorEvent: ProcessorEvent;
        docs: number;
        size: number;
    }>;
    indicesStats: Array<{
        indexName: string;
        numberOfDocs: number;
        primary: string | number | undefined;
        replica: string | number | undefined;
        size: number | undefined;
        dataStream: string | undefined;
        lifecyclePhase: string | undefined;
    }>;
}
export declare function getStorageDetails({ apmEventClient, context, indexLifecyclePhase, randomSampler, environment, kuery, start, end, serviceName, }: {
    apmEventClient: APMEventClient;
    context: ApmPluginRequestHandlerContext;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    environment: Environment;
    kuery: string;
    start: number;
    end: number;
    serviceName: string;
}): Promise<StorageDetailsResponse>;
