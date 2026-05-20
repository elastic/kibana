import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';
type FocusedTrace = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>;
interface Props {
    items: FocusedTrace;
    isEmbeddable?: boolean;
    onErrorClick?: (params: {
        traceId: string;
        docId: string;
    }) => void;
    getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
}
export declare function flattenChildren(children: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree']): TraceItem[];
export declare function reparentDocumentToRoot(items: FocusedTrace['traceItems']): import("@kbn/apm-types").FocusedTraceItems | undefined;
export declare function FocusedTraceWaterfall({ items, onErrorClick, isEmbeddable, getServiceBadgeHref, }: Props): React.JSX.Element;
export {};
