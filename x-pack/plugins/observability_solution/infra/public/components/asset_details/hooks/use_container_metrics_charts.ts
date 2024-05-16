/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import { ContainerMetricTypes } from '../charts/types';

const getSubtitleFromFormula = (value: string) =>
  value.startsWith('max')
    ? i18n.translate('xpack.infra.containerViewPage.kpi.subtitle.max', { defaultMessage: 'Max' })
    : i18n.translate('xpack.infra.assetDetails.kpi.subtitle.average', {
        defaultMessage: 'Average',
      });

export const useDockerContainerPageViewMetricsCharts = ({
  metric,
  metricsDataViewId,
}: {
  metric: ContainerMetricTypes;
  metricsDataViewId?: string;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const containerCharts = await getDockerContainerCharts(metric);

    return containerCharts.map((chart) => {
      return {
        ...chart,
        ...(metricsDataViewId && {
          dataset: {
            index: metricsDataViewId,
          },
        }),
      };
    });
  }, [metricsDataViewId]);

  return { charts, error };
};

const getDockerContainerCharts = async (metric: ContainerMetricTypes) => {
  const model = findInventoryModel('container');
  const { cpu, memory } = await model.metrics.getCharts();

  switch (metric) {
    case 'cpu':
      return [cpu.xy.dockerContainerCpuUsage];
    case 'memory':
      return [memory.xy.dockerContainerMemoryUsage];
    default:
      return [];
  }
};

export const useK8sContainerPageViewMetricsCharts = ({
  metric,
  metricsDataViewId,
}: {
  metric: ContainerMetricTypes;
  metricsDataViewId?: string;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const containerK8sCharts = await getK8sContainerCharts(metric);

    return containerK8sCharts.map((chart) => {
      return {
        ...chart,
        ...(metricsDataViewId && {
          dataset: {
            index: metricsDataViewId,
          },
        }),
      };
    });
  }, [metricsDataViewId]);

  return { charts, error };
};

const getK8sContainerCharts = async (metric: ContainerMetricTypes) => {
  const model = findInventoryModel('container');
  const { cpu, memory } = await model.metrics.getCharts();

  switch (metric) {
    case 'cpu':
      return [cpu.xy.k8sContainerCpuUsage];
    case 'memory':
      return [memory.xy.k8sContainerMemoryUsage];
    default:
      return [];
  }
};

export const useDockerContainerKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; getSubtitle?: (formulaValue: string) => string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('container');
    const { cpu, memory } = await model.metrics.getCharts();

    return [cpu.metric.dockerContainerCpuUsage, memory.metric.dockerContainerMemoryUsage].map(
      (chart) => ({
        ...chart,
        seriesColor: options?.seriesColor,
        decimals: 1,
        subtitle: getSubtitle(options, chart),
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      })
    );
  }, [dataViewId, options?.seriesColor, options?.getSubtitle]);

  return charts;
};

export const useK8sContainerKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; getSubtitle?: (formulaValue: string) => string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('container');
    const { cpu, memory } = await model.metrics.getCharts();

    return [cpu.metric.k8sContainerCpuUsage, memory.metric.k8sContainerMemoryUsage].map(
      (chart) => ({
        ...chart,
        seriesColor: options?.seriesColor,
        decimals: 1,
        subtitle: getSubtitle(options, chart),
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      })
    );
  }, [dataViewId, options?.seriesColor, options?.getSubtitle]);

  return charts;
};

function getSubtitle(
  options: { getSubtitle?: ((formulaValue: string) => string) | undefined } | undefined,
  chart: { value: string }
) {
  return options?.getSubtitle
    ? options?.getSubtitle(chart.value)
    : getSubtitleFromFormula(chart.value);
}
