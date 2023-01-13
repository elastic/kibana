/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useMetricsDataViewContext } from '../hooks/use_data_view';
import { UnifiedSearchBar } from './unified_search_bar';
import { HostsTable } from './hosts_table';
import { HostsViewProvider } from '../hooks/use_hosts_view';
import { KPICharts } from './kpi_charts/kpi_charts';
import { ChartContainer } from './charts/chart_container';

export const HostContainer = () => {
  const { metricsDataView, isDataViewLoading, hasFailedLoadingDataView } =
    useMetricsDataViewContext();

  if (isDataViewLoading) {
    return (
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  }

  return hasFailedLoadingDataView || !metricsDataView ? null : (
    <>
      <UnifiedSearchBar dataView={metricsDataView} />
      <EuiSpacer />
      <HostsViewProvider>
        <KPICharts />
        <EuiSpacer />
        <HostsTable />
        <EuiSpacer />
        <ChartContainer />
      </HostsViewProvider>
    </>
  );
};
