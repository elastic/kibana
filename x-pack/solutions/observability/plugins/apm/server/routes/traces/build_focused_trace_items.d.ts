import type { TraceItem, TraceItemChild, FocusedTraceItems } from '@kbn/apm-types';
export declare function buildChildrenTree({ initialTraceDoc, itemsGroupedByParentId, maxNumberOfChildren, }: {
    initialTraceDoc: TraceItem;
    itemsGroupedByParentId: Record<string, TraceItem[]>;
    maxNumberOfChildren: number;
}): TraceItemChild[];
export declare function findRootItem(traceItems: TraceItem[]): TraceItem | undefined;
export declare function buildFocusedTraceItems({ traceItems, docId, }: {
    traceItems: TraceItem[];
    docId: string;
}): FocusedTraceItems | undefined;
