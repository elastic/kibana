import type { DashboardSearchResponseBody } from '@kbn/dashboard-plugin/server';
import { FETCH_STATUS } from './use_fetcher';
export interface SearchDashboardsResult {
    data: DashboardSearchResponseBody['dashboards'];
    status: FETCH_STATUS;
}
export declare function useDashboardFetcher(query?: string): SearchDashboardsResult;
