/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTheme } from '@kbn/observability-shared-plugin/public';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import { KPI_CHART_HEIGHT, METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';
import { type Props, MetricChartWrapper } from '../chart/metric_chart_wrapper';
import { TooltipContent } from '../../../../../components/lens';

export const HostCountKpi = () => {
  const inventoryModel = findInventoryModel('host');
  const { count, loading } = useHostCountContext();
  const { searchCriteria } = useUnifiedSearchContext();
  const euiTheme = useTheme();

  const { value: formulas } = useAsync(() => inventoryModel.metrics.getFormulas());

  const hostsCountChart: Pick<Props, 'id' | 'color' | 'title'> = {
    id: 'hostsViewKPI-hostsCount',
    color: euiTheme.eui.euiColorLightestShade,
    title: i18n.translate('xpack.infra.hostsViewPage.kpi.hostCount.title', {
      defaultMessage: 'Hosts',
    }),
  };

  const subtitle =
    searchCriteria.limit < count
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.hostCount.limit', {
          defaultMessage: 'Limited to {limit}',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : undefined;

  return (
    <MetricChartWrapper
      {...hostsCountChart}
      style={{ height: KPI_CHART_HEIGHT }}
      value={count}
      subtitle={subtitle}
      toolTip={
        <TooltipContent
          formula={formulas?.hostCount.value}
          description={METRICS_TOOLTIP.hostCount}
        />
      }
      loading={loading}
    />
  );
};
