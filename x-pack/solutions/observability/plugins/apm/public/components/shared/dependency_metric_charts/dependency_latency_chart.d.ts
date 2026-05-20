import React from 'react';
import type { DependencyMetricChartsRouteParams } from './dependency_metric_charts_route_params';
export declare function DependencyLatencyChart({ height, dependencyName, rangeFrom, rangeTo, kuery, environment, offset, comparisonEnabled, spanName, }: {
    height: number;
} & DependencyMetricChartsRouteParams): React.JSX.Element;
