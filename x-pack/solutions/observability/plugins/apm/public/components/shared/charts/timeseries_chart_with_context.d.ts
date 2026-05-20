import type { LegendItemListener, YDomainRange } from '@elastic/charts';
import React from 'react';
import type { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import type { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
interface AnomalyTimeseries extends ServiceAnomalyTimeseries {
    color?: string;
}
export interface TimeseriesChartWithContextProps {
    id: string;
    fetchStatus: FETCH_STATUS;
    height?: number;
    onToggleLegend?: LegendItemListener;
    timeseries: Array<TimeSeries<Coordinate>>;
    /**
     * Formatter for y-axis tick values
     */
    yLabelFormat: (y: number) => string;
    /**
     * Formatter for legend and tooltip values
     */
    yTickFormat?: (y: number) => string;
    showAnnotations?: boolean;
    yDomain?: YDomainRange;
    anomalyTimeseries?: AnomalyTimeseries;
    customTheme?: Record<string, unknown>;
    anomalyTimeseriesColor?: string;
}
export declare function TimeseriesChartWithContext({ id, height, fetchStatus, onToggleLegend, timeseries, yLabelFormat, yTickFormat, showAnnotations, yDomain, anomalyTimeseries, customTheme, }: TimeseriesChartWithContextProps): React.JSX.Element;
export {};
