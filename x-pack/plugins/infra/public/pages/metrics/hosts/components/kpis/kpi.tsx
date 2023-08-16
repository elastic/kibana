/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { LensChart, TooltipContent } from '../../../../../components/lens';
import { type KPIChartProps, AVERAGE_SUBTITLE } from '../../../../../common/visualizations';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';

export const Kpi = ({ id, title, layers, toolTip, height }: KPIChartProps & { height: number }) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;

  const loading = hostsLoading || hostCountLoading;

  const getSubtitle = () => {
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : AVERAGE_SUBTITLE;
  };

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
  }, [dataView, hostNodes, searchCriteria.filters, shouldUseSearchCriteria]);

  // prevents requestTs and searchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    dateRange: searchCriteria.dateRange,
    query: shouldUseSearchCriteria ? searchCriteria.query : undefined,
    filters,
  });

  return (
    <LensChart
      id={`hostsViewKPI-${id}`}
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      layers={{ ...layers, options: { ...layers.options, subtitle: getSubtitle() } }}
      lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
      loading={loading}
      height={height}
      query={afterLoadedState.query}
      title={title}
      toolTip={<TooltipContent description={toolTip} />}
      visualizationType="lnsMetric"
      disableTriggers
      hidePanelTitles
    />
  );
};
