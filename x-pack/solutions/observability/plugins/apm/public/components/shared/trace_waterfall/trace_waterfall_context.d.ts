import React from 'react';
import type { EuiAccordionProps } from '@elastic/eui';
import type { Error } from '@kbn/apm-types';
import type { IWaterfallGetRelatedErrorsHref, WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';
import type { IWaterfallLegend } from '../../../../common/waterfall/legend';
import type { WaterfallLegendType } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { TraceDataState} from './use_trace_waterfall';
import { type TraceWaterfallItem } from './use_trace_waterfall';
import { type CriticalPathSegment } from './critical_path';
import type { ErrorMark } from '../charts/timeline/marker/error_marker';
import type { AgentMark } from '../charts/timeline/marker/agent_marker';
export type TraceWaterfallScrollStrategy = 'parent' | 'window';
export interface TraceWaterfallContextProps {
    duration: number;
    traceState: TraceDataState;
    traceWaterfall: TraceWaterfallItem[];
    rootItem?: TraceItem;
    margin: {
        left: number;
        right: number;
    };
    traceWaterfallMap: Record<string, TraceWaterfallItem[]>;
    criticalPathSegmentsById: Record<string, CriticalPathSegment<TraceWaterfallItem>[]>;
    showAccordion: boolean;
    isAccordionOpen: boolean;
    accordionStatesMap: Record<string, EuiAccordionProps['forceState']>;
    toggleAccordionState: (id: string) => void;
    toggleAllAccordions: () => void;
    showCriticalPath: boolean;
    setShowCriticalPath: (value: boolean) => void;
    showCriticalPathControl?: boolean;
    onClick?: OnNodeClick;
    onErrorClick?: OnErrorClick;
    contextSpanIds?: string[];
    selectedSpanId?: string;
    scrollToContextOnMount?: boolean;
    getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
    isEmbeddable: boolean;
    legends: IWaterfallLegend[];
    colorBy: WaterfallLegendType;
    showLegend: boolean;
    serviceName?: string;
    message?: string;
    marks: Array<AgentMark | ErrorMark>;
    errorMarks: ErrorMark[];
    agentMarks: AgentMark[];
    scrollElement?: Element;
    scrollStrategy: TraceWaterfallScrollStrategy;
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
export declare const TraceWaterfallContext: React.Context<TraceWaterfallContextProps>;
export interface OnNodeClickOptions {
    flyoutDetailTab?: string;
}
export type OnNodeClick = (id: string, options?: OnNodeClickOptions) => void;
export type OnErrorClick = (params: {
    traceId: string;
    docId: string;
    errorCount: number;
    errorDocId?: string;
    docIndex?: string;
}) => void;
interface Props {
    children: React.ReactNode;
    traceItems: TraceItem[];
    showAccordion: boolean;
    contextSpanIds?: string[];
    scrollStrategy?: TraceWaterfallScrollStrategy;
    onClick?: OnNodeClick;
    onErrorClick?: OnErrorClick;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
    getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
    isEmbeddable: boolean;
    showLegend: boolean;
    serviceName?: string;
    isFiltered?: boolean;
    errors?: Error[];
    agentMarks?: Record<string, number>;
    showCriticalPathControl?: boolean;
    showCriticalPath?: boolean;
    defaultShowCriticalPath?: boolean;
    onShowCriticalPathChange?: (value: boolean) => void;
    entryTransactionId?: string;
    scrollToContextOnMount?: boolean;
    scrollElement?: Element;
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
export declare function TraceWaterfallContextProvider({ children, traceItems, showAccordion, contextSpanIds, scrollStrategy, onClick, onErrorClick, getServiceBadgeHref, scrollElement, getRelatedErrorsHref, isEmbeddable, showLegend, serviceName, isFiltered, errors, agentMarks, showCriticalPathControl, showCriticalPath: controlledValue, defaultShowCriticalPath, onShowCriticalPathChange, entryTransactionId, scrollToContextOnMount, ebt, }: Props): React.JSX.Element;
export declare function useTraceWaterfallContext(): TraceWaterfallContextProps;
export declare function groupByParent(items: TraceWaterfallItem[]): Record<string, TraceWaterfallItem[]>;
export declare function filterMapByCriticalPath(map: Record<string, TraceWaterfallItem[]>, criticalPathSegmentsById: Record<string, CriticalPathSegment<TraceWaterfallItem>[]>): Record<string, TraceWaterfallItem[]>;
/**
 * Returns the set of ancestor IDs for a given target item.
 * Used to expand collapsed accordion nodes so the target becomes visible.
 */
export declare function getAncestorIds(items: TraceWaterfallItem[], targetId?: string): Set<string>;
export {};
