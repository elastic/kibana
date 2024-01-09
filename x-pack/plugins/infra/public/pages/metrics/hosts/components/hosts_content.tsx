/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { HostsTable } from './hosts_table';
import { KPIGrid } from './kpis/kpi_grid';
import { Tabs } from './tabs/tabs';
import { AlertsQueryProvider } from '../hooks/use_alerts_query';
import { HostsViewProvider } from '../hooks/use_hosts_view';
import { HostsTableProvider } from '../hooks/use_hosts_table';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { ErrorCallout } from './error_callout';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { HostCountProvider } from '../hooks/use_host_count';

export const HostsContent = () => {
  const { error, searchCriteria } = useUnifiedSearchContext();
  const {
    services: { telemetry },
  } = useKibanaContextForPlugin();

  const renderHostsTable = () => {
    const startTime = performance.now();
    return (
      <HostsTable
        onRender={({ dataLoadDuration }) => {
          const totalDuration = performance.now() - startTime;
          telemetry.reportPerformanceMetricEvent(
            'infra_hosts_table_load',
            totalDuration,
            {
              key1: 'data_load',
              value1: dataLoadDuration,
              key2: 'render_time',
              value2: totalDuration - (dataLoadDuration ?? 0),
            },
            { limit: searchCriteria.limit }
          );
        }}
      />
    );
  };

  return (
    <>
      {error ? (
        <ErrorCallout error={error} hasDetailsModal />
      ) : (
        <HostsViewProvider>
          <HostsTableProvider>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <HostCountProvider>
                  <KPIGrid />
                </HostCountProvider>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{renderHostsTable()}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AlertsQueryProvider>
                  <Tabs />
                </AlertsQueryProvider>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HostsTableProvider>
        </HostsViewProvider>
      )}
    </>
  );
};
