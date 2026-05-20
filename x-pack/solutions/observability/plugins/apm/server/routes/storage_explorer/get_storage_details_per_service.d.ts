import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getStorageDetailsPerProcessorEvent({ apmEventClient, context, indexLifecyclePhase, randomSampler, start, end, environment, kuery, serviceName, }: {
    apmEventClient: APMEventClient;
    context: ApmPluginRequestHandlerContext;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    serviceName: string;
}): Promise<{
    processorEvent: ProcessorEvent;
    docs: number;
    size: number;
}[]>;
export declare function getStorageDetailsPerIndex({ apmEventClient, context, indexLifecyclePhase, randomSampler, start, end, environment, kuery, serviceName, }: {
    apmEventClient: APMEventClient;
    context: ApmPluginRequestHandlerContext;
    indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
    randomSampler: RandomSampler;
    start: number;
    end: number;
    environment: string;
    kuery: string;
    serviceName: string;
}): Promise<{
    indexName: string;
    numberOfDocs: number;
    primary: string | number | undefined;
    replica: string | number | undefined;
    size: number | undefined;
    dataStream: string | undefined;
    lifecyclePhase: string | undefined;
}[]>;
