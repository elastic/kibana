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
import { DOCKER_METRIC_TYPES, INTEGRATIONS, KUBERNETES_METRIC_TYPES } from '../../constants';
import { useIntegrationCheck } from '../../hooks/use_integration_check';

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

  return (
    <MetricsTemplate ref={ref}>
      {isDockerContainer &&
        DOCKER_METRIC_TYPES.map((metric) => (
          <DockerCharts
            key={metric}
            assetId={asset.id}
            dataView={metrics.dataView}
            dateRange={state.dateRange}
            metric={metric}
          />
        ))}
      {!isDockerContainer &&
        isKubernetesContainer &&
        KUBERNETES_METRIC_TYPES.map((metric) => (
          <KubernetesContainerCharts
            key={metric}
            assetId={asset.id}
            dataView={metrics.dataView}
            dateRange={state.dateRange}
            metric={metric}
          />
        ))}
    </MetricsTemplate>
  );
};
