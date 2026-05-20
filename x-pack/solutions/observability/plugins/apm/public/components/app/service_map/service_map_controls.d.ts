import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { type ServiceMapControlConfig } from './service_map_control_panels_config';
interface Props {
    dataView: DataView;
    timeRange: TimeRange;
    filters: Filter[];
    query: Query;
    onFiltersChange: (filters: Filter[]) => void;
    /**
     * Per-field initial selections keyed by field_name (e.g. `{ 'service.environment': ['production'] }`).
     * Captured in a ref on mount so Controls don't re-initialise when the prop reference changes.
     */
    initialSelections?: Record<string, string[]>;
    controlsConfig?: ServiceMapControlConfig[];
}
/**
 * Renders Controls API dropdown filters for the service map.
 * Subscribes to `appliedFilters$` and propagates changes via `onFiltersChange`.
 */
export declare function ServiceMapControls({ dataView, timeRange, filters, query, onFiltersChange, initialSelections, controlsConfig, }: Props): React.JSX.Element;
export {};
