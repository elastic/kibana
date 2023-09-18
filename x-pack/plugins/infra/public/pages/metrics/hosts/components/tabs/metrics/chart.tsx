/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { XYVisualOptions } from '@kbn/lens-embeddable-utils';
import type { AssetXYChartProps } from '../../../../../../common/visualizations';
import { LensChart } from '../../../../../../components/lens';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { buildCombinedHostsFilter } from '../../../../../../utils/filters/build';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { useAfterLoadedState } from '../../../hooks/use_after_loaded_state';
import { METRIC_CHART_HEIGHT } from '../../../constants';

export interface ChartProps extends AssetXYChartProps {
  visualOptions?: XYVisualOptions;
}

export const Chart = ({ id, title, layers, visualOptions, overrides }: ChartProps) => {
  const { parsedDateRange, searchCriteria } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, loading } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();

  const shouldUseSearchCriteria = currentPage.length === 0;

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    dateRange: parsedDateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
  });

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
  }, [searchCriteria.filters, currentPage, dataView, shouldUseSearchCriteria]);

  return (
    <LensChart
      id={`hostsView-metricChart-${id}`}
      borderRadius="m"
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      height={METRIC_CHART_HEIGHT}
      layers={layers}
      visualOptions={visualOptions}
      lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
      loading={loading}
      filters={filters}
      query={afterLoadedState.query}
      title={title}
      overrides={overrides}
      visualizationType="lnsXY"
    />
  );
};
