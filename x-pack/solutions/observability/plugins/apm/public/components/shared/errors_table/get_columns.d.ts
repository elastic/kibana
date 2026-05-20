import type { EuiBasicTableColumn } from '@elastic/eui';
import type { TypeOf } from '@kbn/typed-react-router-config';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import type { ApmRoutes } from '../../routing/apm_route_config';
type ErrorGroupMainStatistics = APIReturnType<'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics' | 'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name'>;
type ErrorGroupDetailedStatistics = APIReturnType<'POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics'>;
export declare function getColumns({ serviceName, errorGroupDetailedStatisticsLoading, errorGroupDetailedStatistics, comparisonEnabled, query, showErrorType, }: {
    serviceName: string;
    errorGroupDetailedStatisticsLoading: boolean;
    errorGroupDetailedStatistics: ErrorGroupDetailedStatistics;
    comparisonEnabled?: boolean;
    query: TypeOf<ApmRoutes, '/services/{serviceName}/errors'>['query'];
    showErrorType?: boolean;
}): Array<EuiBasicTableColumn<ErrorGroupMainStatistics['errorGroups'][0]>>;
export {};
