/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { LensMetricChart } from '../../../../../components/lens';
import { KPIChartProps } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { useMetricsDataViewContext } from '../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useAfterLoadedState } from '../../hooks/use_after_loaded_state';

export const Tile = ({ id, title, layers, toolTip }: KPIChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { requestTs, hostNodes, loading: hostsLoading } = useHostsViewContext();
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();

  const shouldUseSearchCriteria = hostNodes.length === 0;

  const loading = hostsLoading || hostCountLoading;

  const getSubtitle = () => {
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.metricTrend.subtitle.average.limit', {
          defaultMessage: 'Average (of {limit} hosts)',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : i18n.translate('xpack.infra.hostsViewPage.metricTrend.subtitle.average', {
          defaultMessage: 'Average',
        });
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

  const handleBrushEnd = useCallback(
    ({ range }: BrushTriggerEvent['data']) => {
      const [min, max] = range;
      onSubmit({
        dateRange: {
          from: new Date(min).toISOString(),
          to: new Date(max).toISOString(),
          mode: 'absolute',
        },
      });
    },
    [onSubmit]
  );

  // prevents requestTs and serchCriteria state from reloading the chart
  // we want it to reload only once the table has finished loading
  const { afterLoadedState } = useAfterLoadedState(loading, {
    lastReloadRequestTime: requestTs,
    query: searchCriteria.query,
    dateRange: searchCriteria.dateRange,
    filters,
  });

  return (
    <LensMetricChart
      id={`hostsViewKPIGrid${id}Tile`}
      dataView={dataView}
      dateRange={afterLoadedState.dateRange}
      filters={afterLoadedState.filters}
      layers={{ ...layers, options: { ...layers.options, subtitle: getSubtitle() } }}
      lastReloadRequestTime={afterLoadedState.lastReloadRequestTime}
      loading={loading}
      query={shouldUseSearchCriteria ? afterLoadedState.query : undefined}
      title={title}
      toolTip={toolTip}
      onBrushEnd={handleBrushEnd}
    />
  );
};
