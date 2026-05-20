import type { ComponentProps } from 'react';
import React from 'react';
import type { SparkPlot } from './charts/spark_plot';
interface ListMetricProps extends ComponentProps<typeof SparkPlot> {
    hideSeries?: boolean;
}
export declare function ListMetric(props: ListMetricProps): React.JSX.Element;
export {};
