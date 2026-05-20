import React from 'react';
interface Props {
    traceId: string;
    rangeFrom: string;
    rangeTo: string;
    isOpen: boolean;
    onClose: () => void;
    contextSpanIds?: string[];
}
export declare function TraceWaterfallFlyout({ traceId, rangeFrom, rangeTo, isOpen, onClose, contextSpanIds, }: Props): React.JSX.Element | null;
export {};
