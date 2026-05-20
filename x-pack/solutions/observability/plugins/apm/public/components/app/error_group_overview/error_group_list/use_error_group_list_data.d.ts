import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { TableOptions, VisibleItemsStartEnd } from '../../../shared/managed_table';
type MainStatistics = APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics'>;
export type ErrorGroupItem = MainStatistics['errorGroups'][0];
export declare function useErrorGroupListData({ renderedItemIndices, sorting, }: {
    renderedItemIndices: VisibleItemsStartEnd;
    sorting: TableOptions<ErrorGroupItem>['sort'];
}): {
    setDebouncedSearchQuery: import("lodash").DebouncedFunc<import("react").Dispatch<import("react").SetStateAction<string>>>;
    mainStatistics: {
        requestId: string;
        errorGroups: Array<{
            groupId: string;
            name: string;
            lastSeen: number;
            occurrences: number;
            culprit: string | undefined;
            handled: boolean | undefined;
            type: string | undefined;
            traceId: string | undefined;
        }>;
        maxCountExceeded: boolean;
    };
    mainStatisticsStatus: import("../../../../hooks/use_fetcher").FETCH_STATUS;
    detailedStatistics: import("../../../../../server/routes/errors/get_error_groups/get_error_group_detailed_statistics").ErrorGroupPeriodsResponse;
    detailedStatisticsStatus: import("../../../../hooks/use_fetcher").FETCH_STATUS;
};
export {};
