import React from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
export interface SpanLinksCount {
    linkedChildren: number;
    linkedParents: number;
}
interface Props {
    spanLinksCount: SpanLinksCount;
    traceId: string;
    spanId: string;
    processorEvent: ProcessorEvent;
}
export declare function SpanLinks({ spanLinksCount, traceId, spanId, processorEvent }: Props): React.JSX.Element;
export {};
