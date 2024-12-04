/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { Kpi } from './kpi';
import { useLogsCharts } from '../../hooks/use_log_charts';

export interface LogsKpiChartsProps {
  dataView?: DataView;
  dateRange: TimeRange;
  query?: Query;
  filters?: Filter[];
  searchSessionId?: string;
  getSubtitle?: (formulaValue: string) => string;
  loading?: boolean;
}

export const LogsKpiCharts = ({
  dateRange,
  dataView,
  filters,
  query,
  searchSessionId,
  loading = false,
}: LogsKpiChartsProps) => {
  const { charts } = useLogsCharts({
    dataViewId: dataView?.id,
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
