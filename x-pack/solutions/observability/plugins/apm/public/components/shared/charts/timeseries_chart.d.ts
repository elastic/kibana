import type { LineAnnotation, SettingsSpec } from '@elastic/charts';
import type { RectAnnotation } from '@elastic/charts';
import type { ReactElement } from 'react';
import React from 'react';
import type { TimeseriesChartWithContextProps } from './timeseries_chart_with_context';
interface TimeseriesChartProps extends TimeseriesChartWithContextProps {
    comparisonEnabled: boolean;
    offset?: string;
    timeZone: string;
    annotations?: Array<ReactElement<typeof RectAnnotation | typeof LineAnnotation>>;
    settings?: Partial<SettingsSpec>;
}
export declare function TimeseriesChart({ id, height, fetchStatus, onToggleLegend, timeseries, yLabelFormat, yTickFormat, showAnnotations, yDomain, anomalyTimeseries, customTheme, comparisonEnabled, offset, timeZone, annotations, settings, }: TimeseriesChartProps): React.JSX.Element;
export {};
