import React from 'react';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { SpanLinksCount } from '.';
interface Props {
    spanLinksCount: SpanLinksCount;
    traceId: string | undefined;
    spanId: string | undefined;
    processorEvent: ProcessorEvent;
}
export declare function getSpanLinksTabContent({ spanLinksCount, traceId, spanId, processorEvent }: Props): {
    id: string;
    'data-test-subj': string;
    prepend: React.JSX.Element;
    name: React.JSX.Element;
    append: React.JSX.Element;
    content: React.JSX.Element;
} | undefined;
export {};
