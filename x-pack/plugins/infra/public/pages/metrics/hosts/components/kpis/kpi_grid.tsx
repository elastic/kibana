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
import { i18n } from '@kbn/i18n';
import useAsync from 'react-use/lib/useAsync';
import { KPI_CHART_HEIGHT } from '../../../../../common/visualizations';
import { HostMetricsDocsLink } from '../../../../../components/lens';
import { Kpi } from './kpi';
import { useHostCountContext } from '../../hooks/use_host_count';
import { HostCountKpi } from './host_count_kpi';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

export const KPIGrid = () => {
  const model = findInventoryModel('host');
  const { searchCriteria } = useUnifiedSearchContext();
  const { euiTheme } = useEuiTheme();
  const { dataView } = useMetricsDataViewContext();
  const { data: hostCountData } = useHostCountContext();

  const { value: dashboards } = useAsync(() => {
    return model.metrics.getDashboards();
  });

  const subtitle =
    searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : undefined;

  const charts = useMemo(
    () =>
      dashboards?.kpi.get({
        metricsDataView: dataView,
        options: {
          backgroundColor: euiTheme.colors.lightestShade,
          ...(subtitle ? { subtitle } : {}),
        },
      }).charts ?? [],
    [dashboards?.kpi, dataView, euiTheme.colors.lightestShade, subtitle]
  );

  return (
    <>
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
    </>
  );
};
