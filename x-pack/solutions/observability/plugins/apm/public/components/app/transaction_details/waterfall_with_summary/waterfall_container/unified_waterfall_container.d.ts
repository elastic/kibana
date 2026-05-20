import type { Error } from '@kbn/apm-types';
import React from 'react';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
interface Props {
    traceItems: TraceItem[];
    errors: Error[];
    agentMarks: Record<string, number>;
    waterfallItemId?: string;
    serviceName?: string;
    showCriticalPath: boolean;
    onShowCriticalPathChange: (value: boolean) => void;
    entryTransactionId?: string;
    traceDocsTotal?: number;
    maxTraceItems?: number;
    discoverHref?: string;
}
export declare function UnifiedWaterfallContainer({ traceItems, errors, agentMarks, serviceName, waterfallItemId, showCriticalPath, onShowCriticalPathChange, entryTransactionId, traceDocsTotal, maxTraceItems, discoverHref, }: Props): React.JSX.Element;
export {};
