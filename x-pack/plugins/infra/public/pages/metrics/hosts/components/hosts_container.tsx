/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useMetricsDataViewContext } from '../hooks/use_data_view';
import { UnifiedSearchBar } from './search_bar/unified_search_bar';
import { HostsTable } from './hosts_table';
import { KPIGrid } from './kpis/kpi_grid';
import { Tabs } from './tabs/tabs';
import { AlertsQueryProvider } from '../hooks/use_alerts_query';
import { HostsViewProvider } from '../hooks/use_hosts_view';
import { HostsTableProvider } from '../hooks/use_hosts_table';

export const HostContainer = () => {
  const { dataView, loading, hasError } = useMetricsDataViewContext();

  const isLoading = loading || !dataView;
  if (isLoading && !hasError) {
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

  return hasError ? null : (
    <>
      <UnifiedSearchBar />
      <EuiSpacer />
      <HostsViewProvider>
        <HostsTableProvider>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <KPIGrid />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <HostsTable />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AlertsQueryProvider>
                <Tabs />
              </AlertsQueryProvider>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HostsTableProvider>
      </HostsViewProvider>
    </>
  );
};
