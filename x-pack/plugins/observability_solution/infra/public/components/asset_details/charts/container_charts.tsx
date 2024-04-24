/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import {
  useContainerK8sPageViewMetricsCharts,
  useContainerPageViewMetricsCharts,
} from '../hooks/use_metrics_charts';
import { Section } from '../components/section';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';
import { useIntegrationCheck } from '../hooks/use_integration_check';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
  overview?: boolean;
  metric: 'cpu' | 'memory';
  onShowAll?: (metric: string) => void;
}

export const DockerCharts = React.forwardRef<HTMLDivElement, Props>(
  ({ assetId, dataView, dateRange, metric }, ref) => {
    const { charts } = useContainerPageViewMetricsCharts({
      metricsDataViewId: dataView?.id,
    });
    return (
      <Section
        data-test-subj={`infraAssetDetailsContainerChartsSection${metric}`}
        id={metric}
        ref={ref}
      >
        <ChartsGrid columns={2}>
          {charts.map((chart) => (
            <Chart
              key={chart.id}
              {...chart}
              assetId={assetId}
              dateRange={dateRange}
              queryField={findInventoryFields('container').id}
            />
          ))}
        </ChartsGrid>
      </Section>
    );
  }
);

export const KubernetesCharts = React.forwardRef<HTMLDivElement, Props>(
  ({ assetId, dataView, dateRange, metric }, ref) => {
    const { charts } = useContainerK8sPageViewMetricsCharts({
      metricsDataViewId: dataView?.id,
    });
    return (
      <Section
        data-test-subj={`infraAssetDetailsContainerChartsSection${metric}`}
        id={metric}
        ref={ref}
      >
        <ChartsGrid columns={2}>
          {charts.map((chart) => (
            <Chart
              key={chart.id}
              {...chart}
              assetId={assetId}
              dateRange={dateRange}
              queryField={findInventoryFields('container').id}
            />
          ))}
        </ChartsGrid>
      </Section>
    );
  }
);

export const ContainerCharts = React.forwardRef<HTMLDivElement, Props>(
  ({ assetId, dataView, dateRange, metric }) => {
    const isK8sContainer = useIntegrationCheck({ dependsOn: 'kubernetes' });

    if (isK8sContainer) {
      return (
        <KubernetesCharts
          assetId={assetId}
          dataView={dataView}
          dateRange={dateRange}
          metric={metric}
        />
      );
    }
    return (
      <DockerCharts assetId={assetId} dataView={dataView} dateRange={dateRange} metric={metric} />
    );
  }
);
