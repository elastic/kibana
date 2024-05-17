import type { LensConfig, LensDataviewDataset } from '@kbn/lens-embeddable-utils/config_builder';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import { LensChart } from '../../../../../../components/lens';
import { useDataView } from '../../../../../../hooks/use_data_view';
import { buildCombinedAssetFilter } from '../../../../../../utils/filters/build';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';

export type ChartProps = LensConfig & {
  id: string;
};

export const Chart = ({ id, ...chartProps }: ChartProps) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { loading, searchSessionId } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();
  const { dataView } = useDataView({ index: (chartProps.dataset as LensDataviewDataset)?.index });

  const shouldUseSearchCriteria = currentPage.length === 0;

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
      ? [...searchCriteria.filters, ...(searchCriteria.panelFilters ?? [])]
      : [
          buildCombinedAssetFilter({
            field: 'host.name',
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [
    shouldUseSearchCriteria,
    searchCriteria.filters,
    searchCriteria.panelFilters,
    currentPage,
    dataView,
  ]);

  return (
    <LensChart
      {...chartProps}
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
