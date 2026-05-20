import type { SpanLinkDetails } from '@kbn/apm-types';
import type { SpanLink } from '../../../typings/es_schemas/raw/fields/span_links';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getSpanLinksDetails({ apmEventClient, spanLinks, kuery, start, end, }: {
    apmEventClient: APMEventClient;
    spanLinks: SpanLink[];
    kuery: string;
    start: number;
    end: number;
}): Promise<SpanLinkDetails[]>;
