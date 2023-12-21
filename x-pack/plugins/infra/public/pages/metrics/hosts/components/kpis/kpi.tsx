/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { ChartModel } from '@kbn/lens-embeddable-utils';
import { METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { LensChart, TooltipContent } from '../../../../../components/lens';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';

export const Kpi = ({
  id,
  height,
  visualizationType = 'lnsMetric',
  dataView,
  ...chartProps
}: ChartModel & { height: number }) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { hostNodes, loading: hostsLoading, searchSessionId } = useHostsViewContext();
  const { isRequestRunning: hostCountLoading } = useHostCountContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;
  const loading = hostsLoading || hostCountLoading;

  const filters = shouldUseSearchCriteria
    ? searchCriteria.filters
    : [
        buildCombinedHostsFilter({
          field: 'host.name',
          values: hostNodes.map((p) => p.name),
          dataView,
        }),
      ];

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading.
  // attributes passed to useAfterLoadedState don't need to be memoized
  const { afterLoadedState } = useAfterLoadedState(loading, {
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
    searchSessionId,
  });

  const tooltipContent = useMemo(
    () =>
      id in METRICS_TOOLTIP ? (
        <TooltipContent description={METRICS_TOOLTIP[id as keyof typeof METRICS_TOOLTIP]} />
      ) : undefined,
    [id]
  );

  return (
    <LensChart
      {...chartProps}
      id={`hostsViewKPI-${id}`}
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      loading={loading}
      height={height}
      visualizationType={visualizationType}
      query={afterLoadedState.query}
      searchSessionId={afterLoadedState.searchSessionId}
      toolTip={tooltipContent}
      disableTriggers
      hidePanelTitles
    />
  );
};
