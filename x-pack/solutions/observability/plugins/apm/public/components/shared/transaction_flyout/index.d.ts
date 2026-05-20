import React from 'react';
import type { SpanLinksCount } from '../span_links';
interface Props {
    transactionId: string;
    traceId: string;
    onClose: () => void;
    errorCount?: number;
    rootTransactionDuration?: number;
    spanLinksCount: SpanLinksCount;
    flyoutDetailTab?: string;
    start: string;
    end: string;
}
export declare function TransactionFlyout({ transactionId, traceId, onClose, errorCount, rootTransactionDuration, spanLinksCount, flyoutDetailTab, start, end, }: Props): React.JSX.Element;
export {};
