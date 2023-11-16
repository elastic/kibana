/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { hostLensFormulas, METRICS_TOOLTIP } from '../../../../../common/visualizations';
import { useHostCountContext } from '../../hooks/use_host_count';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search';

import { type Props, MetricChartWrapper } from '../chart/metric_chart_wrapper';
import { TooltipContent } from '../../../../../components/lens';

const HOSTS_CHART: Omit<Props, 'loading' | 'value' | 'toolTip'> = {
  id: 'hostsViewKPI-hostsCount',
  color: '#6DCCB1',
  title: i18n.translate('xpack.infra.hostsViewPage.kpi.hostCount.title', {
    defaultMessage: 'Hosts',
  }),
};

export const HostCountKpi = ({ height }: { height: number }) => {
  const { data: hostCountData, isRequestRunning: hostCountLoading } = useHostCountContext();
  const { searchCriteria } = useUnifiedSearchContext();

  const getSubtitle = () => {
    return searchCriteria.limit < (hostCountData?.count.value ?? 0)
      ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.hostCount.limit', {
          defaultMessage: 'Limited to {limit}',
          values: {
            limit: searchCriteria.limit,
          },
        })
      : undefined;
  };

  return (
    <MetricChartWrapper
      {...HOSTS_CHART}
      style={{ height }}
      value={hostCountData?.count.value ?? 0}
      subtitle={getSubtitle()}
      toolTip={
        <TooltipContent
          formula={hostLensFormulas.hostCount.value}
          description={METRICS_TOOLTIP.hostCount}
        />
      }
      loading={hostCountLoading}
    />
  );
};
