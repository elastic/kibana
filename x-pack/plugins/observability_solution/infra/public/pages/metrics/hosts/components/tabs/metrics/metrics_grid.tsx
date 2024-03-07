/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DashboardAPI, DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { DashboardContainerInput } from '@kbn/dashboard-plugin/common';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMetricsDataViewContext } from '../../../hooks/use_metrics_data_view';
import metricsDashboardInput from './metrics_dashboard.json';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { HostMetricsExplanationContent } from '../../../../../../components/lens';
import { Popover } from '../../common/popover';

export const MetricsGrid = () => {
  const { dataView } = useMetricsDataViewContext();
  const { currentPage = [] } = useHostsTableContext();
  const { loading, searchSessionId, hostNodes } = useHostsViewContext();
  const shouldUseSearchCriteria = currentPage.length === 0;
  const [dashboard, setDashboard] = useState<DashboardAPI | null>(null);

  const { parsedDateRange, searchCriteria } = useUnifiedSearchContext();

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

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

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
      ...metricsDashboardInput,
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
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {i18n.translate('xpack.infra.metricsGrid.learnMoreAboutMetricsTextLabel', {
              defaultMessage: 'Learn more about metrics',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Popover>
            <HostMetricsExplanationContent />
          </Popover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
      <DashboardRenderer ref={setDashboard} getCreationOptions={getCreationOptions} />
    </>
  );
};
