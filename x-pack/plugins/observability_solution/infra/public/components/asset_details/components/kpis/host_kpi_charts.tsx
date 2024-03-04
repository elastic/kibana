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
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { Kpi } from './kpi';

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

  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, disk, memory } = await model.metrics.getCharts();

    return [
      cpu.metric.cpuUsage,
      cpu.metric.normalizedLoad1m,
      memory.metric.memoryUsage,
      disk.metric.diskUsage,
    ].map((chart) => ({
      ...chart,
      seriesColor: euiTheme.colors.lightestShade,
      decimals: 1,
      subtitle:
        options?.subtitle ??
        i18n.translate('xpack.infra.assetDetails.kpi.subtitle.average', {
          defaultMessage: 'Average',
        }),
      ...(dataView?.id
        ? {
            dataset: {
              index: dataView.id,
            },
          }
        : {}),
    }));
  }, [dataView?.id, euiTheme.colors.lightestShade, options?.subtitle]);

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
