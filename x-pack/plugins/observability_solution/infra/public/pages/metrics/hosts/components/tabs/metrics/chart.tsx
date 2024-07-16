/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { LensConfig, LensDataviewDataset } from '@kbn/lens-embeddable-utils/config_builder';
import useAsync from 'react-use/lib/useAsync';
import { useSearchSessionContext } from '../../../../../../hooks/use_search_session';
import { resolveDataView } from '../../../../../../utils/data_view';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { HOST_NAME_FIELD } from '../../../../../../../common/constants';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import { LensChart } from '../../../../../../components/lens';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';

export type ChartProps = LensConfig & {
  id: string;
};

export const Chart = ({ id, ...chartProps }: ChartProps) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { loading } = useHostsViewContext();
  const { searchSessionId } = useSearchSessionContext();
  const { currentPage } = useHostsTableContext();
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const shouldUseSearchCriteria = currentPage.length === 0;

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

  const { value: filters = [] } = useAsync(async () => {
    const resolvedDataView = await resolveDataView({
      dataViewId: (chartProps.dataset as LensDataviewDataset)?.index,
      dataViewsService: dataViews,
    });

    return shouldUseSearchCriteria
      ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
      : [
          buildCombinedAssetFilter({
            field: HOST_NAME_FIELD,
            values: currentPage.map((p) => p.name),
            dataView: resolvedDataView.dataViewReference,
          }),
        ];
  }, [
    currentPage,
    dataViews,
    chartProps.dataset,
    searchCriteria.filters,
    searchCriteria.panelFilters,
    shouldUseSearchCriteria,
  ]);

  return (
    <LensChart
      lensAttributes={chartProps}
      id={`hostsView-metricChart-${id}`}
      borderRadius="m"
      dateRange={afterLoadedState.dateRange}
      height={METRIC_CHART_HEIGHT}
      loading={loading}
      filters={filters}
      query={afterLoadedState.query}
      searchSessionId={afterLoadedState.searchSessionId}
    />
  );
};
