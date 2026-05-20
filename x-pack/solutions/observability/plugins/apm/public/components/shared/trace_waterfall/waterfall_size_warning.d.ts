import React from 'react';
interface WaterfallSizeWarningProps {
    traceDocsTotal: number;
    maxTraceItems: number;
    discoverHref?: string;
    'data-test-subj'?: string;
}
export declare function WaterfallSizeWarning({ traceDocsTotal, maxTraceItems, discoverHref, 'data-test-subj': dataTestSubj, }: WaterfallSizeWarningProps): React.JSX.Element;
export {};
