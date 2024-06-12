/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useIntersectingState } from '../../hooks/use_intersecting_state';
import { MetricsTemplate } from './metrics_template';
import { DockerCharts, KubernetesContainerCharts } from '../../charts';
import { HostMetricTypes } from '../../charts/types';
import { INTEGRATIONS } from '../../constants';
import { useIntegrationCheck } from '../../hooks/use_integration_check';

const DOCKER_METRIC_TYPES: Array<Exclude<HostMetricTypes, 'kpi' | 'log'>> = [
  'cpu',
  'memory',
  'network',
  'disk',
];

const KUBERNETES_METRIC_TYPES: Array<'cpu' | 'memory'> = ['cpu', 'memory'];

export const ContainerMetrics = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { dateRange } = useDatePickerContext();
  const { asset } = useAssetDetailsRenderPropsContext();
  const { metrics } = useDataViewsContext();

  const state = useIntersectingState(ref, { dateRange });

  const isDockerContainer = useIntegrationCheck({ dependsOn: INTEGRATIONS.docker });
  const isKubernetesContainer = useIntegrationCheck({
    dependsOn: INTEGRATIONS.kubernetesContainer,
  });

  if (!isDockerContainer && !isKubernetesContainer) {
    return null;
  }

  if (isDockerContainer) {
    return (
      <MetricsTemplate ref={ref}>
        {DOCKER_METRIC_TYPES.map((metric) => (
          <DockerCharts
            key={metric}
            assetId={asset.id}
            dataView={metrics.dataView}
            dateRange={state.dateRange}
            metric={metric}
          />
        ))}
      </MetricsTemplate>
    );
  }

  return (
    isKubernetesContainer && (
      <MetricsTemplate ref={ref}>
        {KUBERNETES_METRIC_TYPES.map((metric) => (
          <KubernetesContainerCharts
            key={metric}
            assetId={asset.id}
            dataView={metrics.dataView}
            dateRange={state.dateRange}
            metric={metric}
          />
        ))}
      </MetricsTemplate>
    )
  );
};
