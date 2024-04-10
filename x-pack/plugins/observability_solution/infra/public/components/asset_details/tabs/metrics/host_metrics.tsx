/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { HostMetricTypes } from '../../hooks/use_metrics_charts';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useIntersectingState } from '../../hooks/use_intersecting_state';
import { MetricsTemplate } from './metrics_template';
import { HostCharts, KubernetesCharts } from '../../charts';

const METRIC_TYPES: Array<Exclude<HostMetricTypes, 'kpi'>> = [
  'cpu',
  'memory',
  'network',
  'disk',
  'logs',
];

export const HostMetrics = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { dateRange } = useDatePickerContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { metrics, logs } = useDataViewsContext();

  const state = useIntersectingState(ref, { dateRange });

  return (
    <MetricsTemplate ref={ref}>
      {METRIC_TYPES.map((metric) => (
        <HostCharts
          key={metric}
          assetId={asset.id}
          dataView={metric === 'logs' ? logs.dataView : metrics.dataView}
          dateRange={state.dateRange}
          metric={metric}
        />
      ))}
      <KubernetesCharts
        assetId={asset.id}
        dataView={metrics.dataView}
        dateRange={state.dateRange}
      />
    </MetricsTemplate>
  );
};
