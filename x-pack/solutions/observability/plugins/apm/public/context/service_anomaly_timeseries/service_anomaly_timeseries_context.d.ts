import React from 'react';
import type { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
export declare const ServiceAnomalyTimeseriesContext: React.Context<{
    status: FETCH_STATUS;
    allAnomalyTimeseries: ServiceAnomalyTimeseries[];
}>;
export declare function ServiceAnomalyTimeseriesContextProvider({ children, }: {
    children: React.ReactChild;
}): React.JSX.Element;
