import type { ValuesType } from 'utility-types';
import type { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
import type { ITableColumn } from '../../../../../shared/managed_table';
type MobileMainStatisticsByField = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/main_statistics'>;
type MobileMainStatisticsByFieldItem = ValuesType<MobileMainStatisticsByField['mainStatistics']>;
type MobileDetailedStatisticsByField = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics'>;
export declare function getColumns({ detailedStatisticsLoading, detailedStatistics, comparisonEnabled, offset, }: {
    detailedStatisticsLoading: boolean;
    detailedStatistics: MobileDetailedStatisticsByField;
    comparisonEnabled?: boolean;
    offset?: string;
}): Array<ITableColumn<MobileMainStatisticsByFieldItem>>;
export {};
