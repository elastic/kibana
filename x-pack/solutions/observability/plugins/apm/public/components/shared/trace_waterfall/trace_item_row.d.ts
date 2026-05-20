import type { EuiAccordionProps } from '@elastic/eui';
import React from 'react';
import type { CriticalPathSegment } from './critical_path';
import { type BarSegment } from './bar';
import type { TraceWaterfallItem } from './use_trace_waterfall';
export interface Props {
    item: TraceWaterfallItem;
    childrenCount: number;
    state: EuiAccordionProps['forceState'];
    onToggle: (id: string) => void;
}
export declare const ACCORDION_PADDING_LEFT = 8;
export declare const ACCORDION_HEIGHT = 48;
export declare const BORDER_THICKNESS = 1;
export declare function TraceItemRow({ item, childrenCount, state, onToggle }: Props): React.JSX.Element;
/**
 * Converts critical path segments into visual overlay segments for rendering in the waterfall bar.
 *
 * This function:
 * 1. Filters segments to only include "self" segments (active contribution to critical path)
 * 2. Calculates relative positioning within the item's duration
 * 3. Returns segments ready for rendering as overlays
 */
export declare function getCriticalPathOverlays(segments: CriticalPathSegment<TraceWaterfallItem>[] | undefined, item: TraceWaterfallItem, color: string): BarSegment[] | undefined;
