/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { KPI_CHART_HEIGHT } from '../../../../../common/visualizations';
import { Kpi } from './kpi';

interface Props {
  dataView?: DataView;
  assetName: string;
  dateRange: TimeRange;
}

export const KPIGrid = ({ assetName, dataView, dateRange }: Props) => {
  const model = findInventoryModel('host');
  const { euiTheme } = useEuiTheme();

  const { value: charts = [] } = useAsync(async () => {
    const { cpuCharts, diskCharts, memoryCharts } = await model.metrics.getCharts();
    return [
      cpuCharts.metric.cpuUsage,
      cpuCharts.metric.normalizedLoad1m,
      memoryCharts.metric.memoryUsage,
      diskCharts.metric.diskUsage,
    ].map((chart) => ({
      ...chart,
      seriesColor: euiTheme.colors.lightestShade,
      subtitle: i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
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
  }, [dataView?.id, euiTheme.colors.lightestShade]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="infraAssetDetailsKPIGrid">
      {charts.map((chartProps, index) => (
        <EuiFlexItem key={index}>
          <Kpi
            {...chartProps}
            dateRange={dateRange}
            assetName={assetName}
            height={KPI_CHART_HEIGHT}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
