import React from 'react';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type ApiResponseMainStats = APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
export interface InstancesLatencyDistributionChartProps {
    height: number;
    items?: ApiResponseMainStats['currentPeriod'];
    status: FETCH_STATUS;
    comparisonItems?: ApiResponseMainStats['previousPeriod'];
}
export declare function InstancesLatencyDistributionChart({ height, items, status, comparisonItems, }: InstancesLatencyDistributionChartProps): React.JSX.Element;
export {};
