import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ITelemetryClient, SearchQuerySubmittedParams, ServiceMapDagreLayoutFallbackParams, SloOverviewFlyoutSearchQueriedParams, SloOverviewFlyoutStatusFilteredParams } from './types';
export declare class TelemetryClient implements ITelemetryClient {
    private analytics;
    constructor(analytics: AnalyticsServiceSetup);
    reportSearchQuerySubmitted: (params: SearchQuerySubmittedParams) => void;
    reportSloOverviewFlyoutViewed: () => void;
    reportSloOverviewFlyoutSearchQueried: (params: SloOverviewFlyoutSearchQueriedParams) => void;
    reportSloOverviewFlyoutStatusFiltered: (params: SloOverviewFlyoutStatusFilteredParams) => void;
    reportSloInfoShown: () => void;
    reportServiceMapDagreLayoutFallback: (params: ServiceMapDagreLayoutFallbackParams) => void;
}
