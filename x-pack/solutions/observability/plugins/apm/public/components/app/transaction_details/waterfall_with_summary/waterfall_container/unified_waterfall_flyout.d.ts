import type { History } from 'history';
import React from 'react';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
interface Props {
    waterfallItemId?: string;
    traceItems: TraceItem[];
    toggleFlyout: (params: {
        history: History;
        flyoutDetailTab?: string;
    }) => void;
}
export declare function UnifiedWaterfallFlyout({ waterfallItemId, traceItems, toggleFlyout }: Props): React.JSX.Element | null;
export {};
