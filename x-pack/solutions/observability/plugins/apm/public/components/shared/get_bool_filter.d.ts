import type { UIProcessorEvent } from '../../../common/processor_event';
import type { ApmUrlParams } from '../../context/url_params_context/types';
export declare function getBoolFilter({ groupId, processorEvent, serviceName, environment, urlParams, }: {
    groupId?: string;
    processorEvent?: UIProcessorEvent;
    serviceName?: string;
    environment?: string;
    urlParams: ApmUrlParams;
}): import("@kbn/data-views-plugin/common/types").QueryDslQueryContainer[];
