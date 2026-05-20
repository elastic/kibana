export type ControlSelections = Record<string, string[]>;
/**
 * Syncs filter-bar pills (app-state filters) with the URL `_a` query param.
 *
 * APM already manages `kuery`, `rangeFrom`, `rangeTo`, and `environment` via
 * its own URL params so we only sync the Data plugin's `filterManager` app
 * filters here — not time or query.
 *
 * On mount: reads `_a.filters` from the URL and pushes them into filterManager.
 * On filter change: writes filterManager app filters back to `_a.filters`.
 *
 * Also exposes helpers to persist/restore Controls API selections in `_a.controlSelections`.
 */
export declare function useFilterUrlSync(): {
    persistControlSelections: (selections: ControlSelections) => void;
    getRestoredControlSelections: () => ControlSelections | undefined;
};
