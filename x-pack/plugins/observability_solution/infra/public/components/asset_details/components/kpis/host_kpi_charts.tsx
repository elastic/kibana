/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { Kpi } from './kpi';
import { useHostKpiCharts } from '../../hooks/use_metrics_charts';

export interface HostKpiChartsProps {
  dataView?: DataView;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  searchSessionId?: string;
  options?: {
    subtitle?: string;
  };
  loading?: boolean;
}

export const HostKpiCharts = ({
  dateRange,
  dataView,
  filters,
  options,
  query,
  searchSessionId,
  loading = false,
}: HostKpiChartsProps) => {
  const { euiTheme } = useEuiTheme();
  const charts = useHostKpiCharts({
    dataViewId: dataView?.id,
    options: {
      subtitle: options?.subtitle,
      seriesColor: euiTheme.colors.lightestShade,
    },
  });

  return (
    <>
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            filters={filters}
            query={query}
            searchSessionId={searchSessionId}
            loading={loading}
          />
        </EuiFlexItem>
      ))}
    </>
  );
};
