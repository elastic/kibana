import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { Maybe } from '../../../../../typings/common';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
type MetricChartApiResponse = APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/charts'>;
type MetricChart = MetricChartApiResponse['charts'][0];
interface Props {
    start: Maybe<number | string>;
    end: Maybe<number | string>;
    chart: MetricChart;
    fetchStatus: FETCH_STATUS;
}
export declare function MetricsChart({ chart, fetchStatus }: Props): React.JSX.Element;
export {};
