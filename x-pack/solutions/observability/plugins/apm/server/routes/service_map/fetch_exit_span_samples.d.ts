import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import type { ServiceMapSpan } from '../../../common/service_map/types';
export declare function fetchExitSpanSamplesFromTraceIds({ apmEventClient, traceIds, start, end, }: {
    apmEventClient: APMEventClient;
    traceIds: string[];
    start: number;
    end: number;
}): Promise<ServiceMapSpan[]>;
