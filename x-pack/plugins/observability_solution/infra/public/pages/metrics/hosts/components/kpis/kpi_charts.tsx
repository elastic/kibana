/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSearchSessionContext } from '../../../../../hooks/use_search_session';
import { HostKpiCharts } from '../../../../../components/asset_details';
import { buildCombinedAssetFilter } from '../../../../../utils/filters/build';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';
import { useMetricsDataViewContext } from '../../../../../containers/metrics_source';

export const KpiCharts = () => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { searchSessionId } = useSearchSessionContext();
  const { hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { isRequestRunning: hostCountLoading, data: hostCountData } = useHostCountContext();
  const { metricsView } = useMetricsDataViewContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;
  const loading = hostsLoading || hostCountLoading;

  const filters = shouldUseSearchCriteria
    ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
    : [
        buildCombinedAssetFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
          dataView: metricsView?.dataViewReference,
        }),
      ];

  const getSubtitle = (formulaValue: string) => {
    if (formulaValue.startsWith('max')) {
      return searchCriteria.limit < (hostCountData?.count.value ?? 0)
        ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max.limit', {
            defaultMessage: 'Max (of {limit} hosts)',
            values: {
              limit: searchCriteria.limit,
            },
          })
        : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', {
            defaultMessage: 'Max',
          });
    }
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average', {
          defaultMessage: 'Average',
        });
  };

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
    searchSessionId,
    getSubtitle,
  });

  return (
    <HostKpiCharts
      dataView={metricsView?.dataViewReference}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      query={afterLoadedState.query}
      searchSessionId={afterLoadedState.searchSessionId}
      getSubtitle={afterLoadedState.getSubtitle}
      loading={loading}
    />
  );
};
