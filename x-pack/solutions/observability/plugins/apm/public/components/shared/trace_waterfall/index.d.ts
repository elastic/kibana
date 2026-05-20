import type { EuiAccordionProps } from '@elastic/eui';
import React from 'react';
import type { Error } from '@kbn/apm-types';
import type { IWaterfallGetRelatedErrorsHref, WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { OnErrorClick, OnNodeClick } from './trace_waterfall_context';
import type { TraceWaterfallItem } from './use_trace_waterfall';
/** Base props shared by all TraceWaterfall variants */
interface BaseTraceWaterfallProps {
    traceItems: TraceItem[];
    errors?: Error[];
    showAccordion?: boolean;
    onClick?: OnNodeClick;
    onErrorClick?: OnErrorClick;
    scrollElement?: Element;
    getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
    isEmbeddable?: boolean;
    showLegend?: boolean;
    serviceName?: string;
    isFiltered?: boolean;
    agentMarks?: Record<string, number>;
    showCriticalPathControl?: boolean;
    showCriticalPath?: boolean;
    defaultShowCriticalPath?: boolean;
    onShowCriticalPathChange?: (value: boolean) => void;
    children?: React.ReactNode;
    entryTransactionId?: string;
    traceDocsTotal?: number;
    maxTraceItems?: number;
    discoverHref?: string;
    ebt?: {
        row: {
            element: string;
        };
        errorBadge: {
            element: string;
        };
        serviceBadge: {
            element: string;
        };
    };
}
/** Default: 'window' (page scroll). Use 'parent' for flyout. */
export type TraceWaterfallProps = BaseTraceWaterfallProps & ({
    scrollStrategy?: 'window';
    contextSpanIds?: string[];
} | {
    scrollStrategy: 'parent';
    contextSpanIds?: string[];
    scrollToContextOnMount?: boolean;
});
export declare function TraceWaterfall(props: TraceWaterfallProps): React.JSX.Element;
export declare function convertTreeToList(treeMap: Record<string, TraceWaterfallItem[]>, accordionsState: Record<string, EuiAccordionProps['forceState']>, root?: TraceWaterfallItem): TraceWaterfallItem[];
export {};
