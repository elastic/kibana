import React from 'react';
import type { SpanLinksCount } from '../span_links';
interface Props {
    spanId: string;
    parentTransactionId?: string;
    traceId: string;
    totalDuration?: number;
    spanLinksCount: SpanLinksCount;
    flyoutDetailTab?: string;
    onClose: () => void;
    rangeFrom: string;
    rangeTo: string;
    kuery?: string;
}
export declare function SpanFlyout({ spanId, parentTransactionId, traceId, totalDuration, onClose, spanLinksCount, flyoutDetailTab, rangeFrom, rangeTo, kuery, }: Props): React.JSX.Element;
export {};
