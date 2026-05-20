import type { TelemetryEventTypes } from './types';
export declare const apmTelemetryEventBasedTypes: ({
    eventType: TelemetryEventTypes.SEARCH_QUERY_SUBMITTED;
    schema: import("@elastic/ebt").RootSchema<import("./types").SearchQuerySubmittedParams>;
} | {
    eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_VIEWED;
    schema: {};
} | {
    eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED;
    schema: import("@elastic/ebt").RootSchema<import("./types").SloOverviewFlyoutSearchQueriedParams>;
} | {
    eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_STATUS_FILTERED;
    schema: import("@elastic/ebt").RootSchema<import("./types").SloOverviewFlyoutStatusFilteredParams>;
} | {
    eventType: TelemetryEventTypes.SLO_INFO_SHOWN;
    schema: {};
} | {
    eventType: TelemetryEventTypes.SERVICE_MAP_DAGRE_LAYOUT_FALLBACK;
    schema: import("@elastic/ebt").RootSchema<import("./types").ServiceMapDagreLayoutFallbackParams>;
})[];
