import React from 'react';
import type { DependencyMetricChartsRouteParams } from './dependency_metric_charts_route_params';
export declare function DependencyFailedTransactionRateChart({ height, dependencyName, kuery, environment, rangeFrom, rangeTo, offset, comparisonEnabled, spanName, }: {
    height: number;
} & DependencyMetricChartsRouteParams): React.JSX.Element;
