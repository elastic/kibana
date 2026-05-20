import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { MetricsDashboardProps } from './helper';
export declare function JsonMetricsDashboard(dashboardProps: MetricsDashboardProps): React.JSX.Element;
export declare function getFilters(serviceName: string, environment: string, dataView: DataView): Filter[];
