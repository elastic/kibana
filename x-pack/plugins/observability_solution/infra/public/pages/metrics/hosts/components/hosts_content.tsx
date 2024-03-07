/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DashboardContainerInput } from '@kbn/dashboard-plugin/common';
import { DashboardAPI, DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { buildCombinedHostsFilter } from '../../../../utils/filters/build';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { ErrorCallout } from './error_callout';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { useAfterLoadedState } from '../hooks/use_after_loaded_state';
import { useMetricsDataViewContext } from '../hooks/use_metrics_data_view';
import { AlertsQueryProvider } from '../hooks/use_alerts_query';
import { Tabs } from './tabs/tabs';
import hostsDashboardInput from './hosts_dashboard.json';

export const HostsContent = () => {
  const { error, parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const { loading, searchSessionId, hostNodes } = useHostsViewContext();
  const [dashboard, setDashboard] = useState<DashboardAPI | null>(null);
  const { dataView } = useMetricsDataViewContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? searchCriteria.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: hostNodes.map((p) => p.name),
            dataView,
          }),
        ];
  }, [shouldUseSearchCriteria, searchCriteria.filters, hostNodes, dataView]);

  useEffect(() => {
    if (!dashboard) return;

    dashboard.updateInput({
      timeRange: afterLoadedState.dateRange,
      query: afterLoadedState.query,
      searchSessionId: afterLoadedState.searchSessionId,
      filters,
    });
  }, [
    afterLoadedState.dateRange,
    afterLoadedState.query,
    afterLoadedState.searchSessionId,
    dashboard,
    filters,
  ]);

  const getInitialInput = () =>
    ({
      ...hostsDashboardInput,
      timeRange: parsedDateRange,
    } as DashboardContainerInput);

  const getCreationOptions = () => {
    return Promise.resolve({
      getInitialInput,
      useControlGroupIntegration: true,
      useUnifiedSearchIntegration: true,
    });
  };

  return (
    <>
      {error ? (
        <ErrorCallout error={error} hasDetailsModal />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <DashboardRenderer getCreationOptions={getCreationOptions} ref={setDashboard} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertsQueryProvider>
              <Tabs />
            </AlertsQueryProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
