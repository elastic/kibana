import type { Error } from '@kbn/apm-types';
import { WaterfallLegendType, type IWaterfallLegend } from '../../../../common/waterfall/legend';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { OnErrorClick } from './trace_waterfall_context';
import type { ErrorMark } from '../charts/timeline/marker/error_marker';
export interface TraceWaterfallItem extends TraceItem {
    depth: number;
    offset: number;
    skew: number;
    color: string;
    isOrphan?: boolean;
}
export declare function useTraceWaterfall({ traceItems, isFiltered, errors, onErrorClick, entryTransactionId, }: {
    traceItems: TraceItem[];
    isFiltered?: boolean;
    errors?: Error[];
    onErrorClick?: OnErrorClick;
    entryTransactionId?: string;
}): {
    rootItem: TraceItem | undefined;
    traceState: TraceDataState;
    message: string | undefined;
    traceWaterfall: TraceWaterfallItem[];
    duration: number;
    maxDepth: number;
    legends: IWaterfallLegend[];
    colorBy: WaterfallLegendType;
    errorMarks: ErrorMark[];
} | {
    traceState: TraceDataState;
    message: string;
    traceWaterfall: never[];
    legends: never[];
    duration: number;
    maxDepth: number;
    colorBy: WaterfallLegendType;
    errorMarks: never[];
    rootItem?: undefined;
};
export declare function getColorByType(legends: IWaterfallLegend[]): WaterfallLegendType;
export declare function getLegends(traceItems: TraceItem[]): IWaterfallLegend[];
export declare function createColorLookupMap(legends: IWaterfallLegend[]): Map<string, string>;
export declare function getTraceParentChildrenMap(traceItems: TraceItem[], filteredTrace: boolean): Record<string, TraceItem[]>;
export declare enum TraceDataState {
    Full = "full",
    Partial = "partial",
    Empty = "empty",
    Invalid = "invalid"
}
export declare function getRootItemOrFallback(traceParentChildrenMap: Record<string, TraceItem[]>, traceItems: TraceItem[], entryTransactionId?: string): {
    traceState: TraceDataState;
    rootItem?: undefined;
    orphans?: undefined;
} | {
    traceState: TraceDataState;
    rootItem: TraceItem;
    orphans: TraceItem[];
};
type RawTraceWaterfallItem = Omit<TraceWaterfallItem, 'color'>;
export declare function getTraceWaterfall({ rootItem, parentChildMap, orphans, }: {
    rootItem: TraceItem;
    parentChildMap: Record<string, TraceItem[]>;
    orphans: TraceItem[];
}): RawTraceWaterfallItem[];
export declare function getClockSkew({ itemTimestamp, itemDuration, parent, }: {
    itemTimestamp: number;
    itemDuration: number;
    parent?: RawTraceWaterfallItem;
}): number;
export declare function getTraceWaterfallDuration(flattenedTraceWaterfall: TraceWaterfallItem[]): number;
export declare function getSubtreeIds(parentChildMap: Record<string, TraceItem[]>, rootId: string): string[];
export {};
