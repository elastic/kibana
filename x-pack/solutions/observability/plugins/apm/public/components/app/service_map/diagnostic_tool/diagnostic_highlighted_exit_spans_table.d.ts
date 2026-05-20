import React from 'react';
import type { ExitSpanFields } from '../../../../../common/service_map_diagnostic_types';
export interface HighlightedExitSpansTableProps {
    /**
     * Array of objects, each representing one exit span's fields.
     */
    items: ExitSpanFields[];
    /**
     * Optional title for the table.
     */
    title?: string;
}
export declare function HighlightedExitSpansTable({ items, title }: HighlightedExitSpansTableProps): React.JSX.Element;
