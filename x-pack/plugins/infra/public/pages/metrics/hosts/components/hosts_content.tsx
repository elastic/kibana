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
import { ErrorCallout } from './error_callout';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';

export const HostsContent = () => {
  const { error } = useUnifiedSearchContext();

  return (
    <>
      {error ? (
        <ErrorCallout error={error} hasDetailsModal />
      ) : (
        <HostsViewProvider>
          <HostsTableProvider>
            <EuiFlexGroup direction="column" gutterSize="m">
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
      )}
    </>
  );
};
