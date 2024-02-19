/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { LensConfig, LensDataviewDataset } from '@kbn/lens-embeddable-utils/config_builder';
import { Query } from '@kbn/es-query';
import { useDataView } from '../../../../../../hooks/use_data_view';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import { LensChart } from '../../../../../../components/lens';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';

export type ChartProps = LensConfig & {
  id: string;
};

export const Chart = ({ id, ...chartProps }: ChartProps) => {
  const { loading, searchSessionId, searchCriteria } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();
  const { dataView } = useDataView({ index: (chartProps.dataset as LensDataviewDataset)?.index });

  const shouldUseSearchCriteria = currentPage.length === 0;

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    timeRange: searchCriteria.timeRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? [...searchCriteria.filters, ...searchCriteria.panelFilters]
      : [
          buildCombinedHostsFilter({
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
      timeRange={afterLoadedState.timeRange}
      height={METRIC_CHART_HEIGHT}
      loading={loading}
      filters={filters}
      query={afterLoadedState.query as Query}
      searchSessionId={afterLoadedState.searchSessionId}
    />
  );
};
