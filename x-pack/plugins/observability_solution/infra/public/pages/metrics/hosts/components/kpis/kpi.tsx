/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { HostKpiCharts } from '../../../../../components/asset_details';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
import { useMetricsDataViewContext } from '../../hooks/use_metrics_data_view';

export const KpiCharts = () => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { hostNodes, loading: hostsLoading, searchSessionId } = useHostsViewContext();
  const { isRequestRunning: hostCountLoading, data: hostCountData } = useHostCountContext();
  const { dataView } = useMetricsDataViewContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;
  const loading = hostsLoading || hostCountLoading;

  const filters = shouldUseSearchCriteria
    ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
    : [
        buildCombinedHostsFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
          dataView,
        }),
      ];

  const subtitle =
    searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
    searchSessionId,
    subtitle,
  });

  return (
    <HostKpiCharts
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      query={afterLoadedState.query}
      searchSessionId={afterLoadedState.searchSessionId}
      options={{ subtitle: afterLoadedState.subtitle }}
      loading={loading}
    />
  );
};
