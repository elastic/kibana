import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getDocumentTypeFilterForServiceDestinationStatistics } from '@kbn/apm-data-access-plugin/server/utils';
import type { APMEventClient } from '../create_es_client/create_apm_event_client';
export declare function getProcessorEventForServiceDestinationStatistics(searchServiceDestinationMetrics: boolean): ProcessorEvent.metric | ProcessorEvent.span;
export declare function getLatencyFieldForServiceDestinationStatistics(searchServiceDestinationMetrics: boolean): "span.duration.us" | "span.destination.service.response_time.sum.us";
export declare function getDocCountFieldForServiceDestinationStatistics(searchServiceDestinationMetrics: boolean): "span.destination.service.response_time.count" | undefined;
export declare function getIsUsingServiceDestinationMetrics({ apmEventClient, useSpanName, kuery, start, end, }: {
    apmEventClient: APMEventClient;
    useSpanName: boolean;
    kuery: string;
    start: number;
    end: number;
}): Promise<boolean>;
export { getDocumentTypeFilterForServiceDestinationStatistics };
