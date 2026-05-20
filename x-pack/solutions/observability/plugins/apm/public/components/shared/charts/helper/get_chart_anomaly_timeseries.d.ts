import type { EuiThemeComputed } from '@elastic/eui';
import type { ServiceAnomalyTimeseries } from '../../../../../common/anomaly_detection/service_anomaly_timeseries';
import type { APMChartSpec } from '../../../../../typings/timeseries';
export declare const expectedBoundsTitle: string;
export declare function getChartAnomalyTimeseries({ anomalyTimeseries, euiTheme, anomalyTimeseriesColor, }: {
    anomalyTimeseries?: ServiceAnomalyTimeseries;
    euiTheme: EuiThemeComputed;
    anomalyTimeseriesColor?: string;
}): {
    boundaries: APMChartSpec[];
    scores: APMChartSpec[];
} | undefined;
