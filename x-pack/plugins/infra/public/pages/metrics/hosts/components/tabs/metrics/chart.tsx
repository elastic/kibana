/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { LensConfig } from '@kbn/lens-embeddable-utils/config_builder';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import { METRIC_CHART_HEIGHT } from '../../../../../../common/visualizations/constants';
import { LensChart } from '../../../../../../components/lens';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';

export type ChartProps = LensConfig & {
  id: string;
};

export const Chart = ({ id, ...chartProps }: ChartProps) => {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();
  const { searchCriteria } = useUnifiedSearchContext();
  const { loading, searchSessionId } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  const shouldUseSearchCriteria = currentPage.length === 0;

  // prevents searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    searchSessionId,
  });

  const { value: dataView } = useAsync(async () => {
    if (!chartProps.dataset) {
      return undefined;
    }
    if ('index' in chartProps.dataset) {
      return dataViews.get(chartProps.dataset.index, false);
    }
  }, [chartProps.dataset]);

  const filters = useMemo(() => {
    return shouldUseSearchCriteria
      ? searchCriteria.filters
      : [
          buildCombinedHostsFilter({
            field: 'host.name',
            values: currentPage.map((p) => p.name),
            dataView,
          }),
        ];
  }, [shouldUseSearchCriteria, searchCriteria.filters, currentPage, dataView]);

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
