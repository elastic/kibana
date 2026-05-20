import React from 'react';
import type { APIReturnType } from '../../../../../../services/rest/create_call_apm_api';
type MobileMainStatisticsByField = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/main_statistics'>['mainStatistics'];
type MobileDetailedStatisticsByField = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics'>;
interface Props {
    isLoading: boolean;
    mainStatistics: MobileMainStatisticsByField;
    detailedStatisticsLoading: boolean;
    detailedStatistics: MobileDetailedStatisticsByField;
    comparisonEnabled?: boolean;
    offset?: string;
}
export declare function StatsList({ isLoading, mainStatistics, detailedStatisticsLoading, detailedStatistics, comparisonEnabled, offset, }: Props): React.JSX.Element;
export {};
