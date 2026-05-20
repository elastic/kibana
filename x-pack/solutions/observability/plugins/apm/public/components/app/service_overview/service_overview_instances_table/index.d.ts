import React from 'react';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { SortDirection } from '../service_overview_instances_chart_and_table';
import type { InstancesSortField } from '../../../../../common/instances';
type ServiceInstanceMainStatistics = APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem = ServiceInstanceMainStatistics['currentPeriod'][0];
type ServiceInstanceDetailedStatistics = APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;
export interface TableOptions {
    pageIndex: number;
    sort: {
        direction: SortDirection;
        field: InstancesSortField;
    };
}
interface Props {
    mainStatsItems: MainStatsServiceInstanceItem[];
    serviceName: string;
    mainStatsStatus: FETCH_STATUS;
    mainStatsItemCount: number;
    tableOptions: TableOptions;
    onChangeTableOptions: (newTableOptions: {
        page?: {
            index: number;
        };
        sort?: {
            field: string;
            direction: SortDirection;
        };
    }) => void;
    detailedStatsLoading: boolean;
    detailedStatsData?: ServiceInstanceDetailedStatistics;
    isLoading: boolean;
    isNotInitiated: boolean;
}
export declare function ServiceOverviewInstancesTable({ mainStatsItems, mainStatsItemCount, serviceName, mainStatsStatus: status, tableOptions, onChangeTableOptions, detailedStatsLoading, detailedStatsData: detailedStatsData, isLoading, isNotInitiated, }: Props): React.JSX.Element;
export {};
