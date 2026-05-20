import React from 'react';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
type ErrorGroupItem = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics'>['errorGroups'][0];
type ErrorGroupDetailedStatistics = APIReturnType<'POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics'>;
interface Props {
    mainStatistics: ErrorGroupItem[];
    serviceName: string;
    detailedStatisticsLoading: boolean;
    detailedStatistics: ErrorGroupDetailedStatistics;
    initialSortField: string;
    initialSortDirection: 'asc' | 'desc';
    comparisonEnabled?: boolean;
    isLoading: boolean;
}
declare function MobileCrashGroupList({ mainStatistics, serviceName, detailedStatisticsLoading, detailedStatistics, comparisonEnabled, initialSortField, initialSortDirection, isLoading, }: Props): React.JSX.Element;
export { MobileCrashGroupList };
