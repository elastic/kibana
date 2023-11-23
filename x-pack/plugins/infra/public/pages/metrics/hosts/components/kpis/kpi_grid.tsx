/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { useEuiTheme } from '@elastic/eui';
import { KPI_CHART_HEIGHT } from '../../../../../common/visualizations';
import { HostMetricsDocsLink } from '../../../../../components/lens';
import { Kpi } from './kpi';
import { HostCountProvider } from '../../hooks/use_host_count';
import { HostCountKpi } from './host_count_kpi';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';

export const KPIGrid = () => {
  const model = findInventoryModel('host');
  const { euiTheme } = useEuiTheme();
  const { dataView } = useMetricsDataViewContext();

  const charts = useMemo(
    () =>
      (dataView
        ? model.metrics.dashboards?.kpi.get({
            metricsDataView: dataView,
            options: {
              backgroundColor: euiTheme.colors.lightestShade,
            },
          }).charts
        : []) ?? [],
    [dataView, euiTheme.colors.lightestShade, model.metrics.dashboards?.kpi]
  );

  return (
    <HostCountProvider>
      <HostMetricsDocsLink type="metrics" />
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s" data-test-subj="hostsViewKPIGrid">
        <EuiFlexItem>
          <HostCountKpi height={KPI_CHART_HEIGHT} />
        </EuiFlexItem>
        {charts.map((chartProp, index) => (
          <EuiFlexItem key={index}>
            <Kpi {...chartProp} height={KPI_CHART_HEIGHT} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </HostCountProvider>
  );
};
