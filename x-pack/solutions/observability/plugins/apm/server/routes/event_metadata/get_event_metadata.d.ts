import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getEventMetadata({ apmEventClient, processorEvent, id, start, end, }: {
    apmEventClient: APMEventClient;
    processorEvent: ProcessorEvent;
    id: string;
    start: number;
    end: number;
}): Promise<Partial<Record<string, unknown[]>>>;
