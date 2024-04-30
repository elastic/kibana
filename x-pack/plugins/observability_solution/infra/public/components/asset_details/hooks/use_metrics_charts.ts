/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';

export type HostMetricTypes = 'cpu' | 'memory' | 'network' | 'disk' | 'log' | 'kpi';
export type ContainerMetricTypes = 'cpu' | 'memory';
interface UseChartsOptions {
  overview?: boolean;
}

export const useHostCharts = ({
  metric,
  dataViewId,
  options,
}: {
  metric: HostMetricTypes;
  dataViewId?: string;
  options?: UseChartsOptions;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const hostCharts = await getHostsCharts({ metric, options });
    return hostCharts.map((chart) => ({
      ...chart,
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId]);

  return { charts, error };
};

export const useKubernetesCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: UseChartsOptions;
}) => {
  const model = findInventoryModel('host');

  const { value: charts = [], error } = useAsync(async () => {
    const { kibernetesNode } = await model.metrics.getCharts();

    const items = options?.overview
      ? [kibernetesNode.xy.nodeCpuCapacity, kibernetesNode.xy.nodeMemoryCapacity]
      : [
          kibernetesNode.xy.nodeCpuCapacity,
          kibernetesNode.xy.nodeMemoryCapacity,
          kibernetesNode.xy.nodeDiskCapacity,
          kibernetesNode.xy.nodePodCapacity,
        ];

    return items.map((chart) => {
      return {
        ...chart,
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      };
    });
  }, [dataViewId, options?.overview]);

  return { charts, error };
};

const getSubtitleFromFormula = (value: string) =>
  value.startsWith('max')
    ? i18n.translate('xpack.infra.hostsViewPage.kpi.subtitle.max', { defaultMessage: 'Max' })
    : i18n.translate('xpack.infra.assetDetails.kpi.subtitle.average', {
        defaultMessage: 'Average',
      });

export const useHostKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; getSubtitle?: (formulaValue: string) => string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, memory, disk } = await model.metrics.getCharts();

    return [
      cpu.metric.cpuUsage,
      cpu.metric.normalizedLoad1m,
      memory.metric.memoryUsage,
      disk.metric.diskUsage,
    ].map((chart) => ({
      ...chart,
      seriesColor: options?.seriesColor,
      decimals: 1,
      subtitle: options?.getSubtitle
        ? options?.getSubtitle(chart.value)
        : getSubtitleFromFormula(chart.value),
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId, options?.seriesColor, options?.getSubtitle]);

  return charts;
};

const getHostsCharts = async ({
  metric,
  options,
}: {
  metric: HostMetricTypes;
  options?: UseChartsOptions;
}) => {
  const model = findInventoryModel('host');
  const { cpu, memory, network, disk, logs } = await model.metrics.getCharts();

  switch (metric) {
    case 'cpu':
      return options?.overview
        ? [cpu.xy.cpuUsage, cpu.xy.normalizedLoad1m]
        : [
            cpu.xy.cpuUsage,
            cpu.xy.cpuUsageBreakdown,
            cpu.xy.normalizedLoad1m,
            cpu.xy.loadBreakdown,
          ];
    case 'memory':
      return options?.overview
        ? [memory.xy.memoryUsage]
        : [memory.xy.memoryUsage, memory.xy.memoryUsageBreakdown];
    case 'network':
      return [network.xy.rxTx];
    case 'disk':
      return options?.overview
        ? [disk.xy.diskUsageByMountPoint, disk.xy.diskIOReadWrite]
        : [disk.xy.diskUsageByMountPoint, disk.xy.diskIOReadWrite, disk.xy.diskThroughputReadWrite];
    case 'log':
      return [logs.xy.logRate];
    default:
      return [];
  }
};

export const useContainerPageViewMetricsCharts = ({
  metric,
  metricsDataViewId,
}: {
  metric: ContainerMetricTypes;
  metricsDataViewId?: string;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const containerCharts = await getContainerCharts(metric);

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

const getContainerCharts = async (metric: ContainerMetricTypes) => {
  const model = findInventoryModel('container');
  const { cpu, memory } = await model.metrics.getCharts();

  switch (metric) {
    case 'cpu':
      return [cpu.xy.containerCpuUsage];
    case 'memory':
      return [memory.xy.containerMemoryUsage];
    default:
      return [];
  }
};

export const useContainerK8sPageViewMetricsCharts = ({
  metric,
  metricsDataViewId,
}: {
  metric: ContainerMetricTypes;
  metricsDataViewId?: string;
}) => {
  const { value: charts = [], error } = useAsync(async () => {
    const containerK8sCharts = await getContainerK8sCharts(metric);

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

const getContainerK8sCharts = async (metric: ContainerMetricTypes) => {
  const model = findInventoryModel('container');
  const { cpu, memory } = await model.metrics.getCharts();

  switch (metric) {
    case 'cpu':
      return [cpu.xy.containerK8sCpuUsage];
    case 'memory':
      return [memory.xy.containerK8sMemoryUsage];
    default:
      return [];
  }
};

export const useContainerKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; getSubtitle?: (formulaValue: string) => string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('container');
    const { cpu, memory } = await model.metrics.getCharts();

    return [cpu.metric.containerCpuUsage, memory.metric.containerMemoryUsage].map((chart) => ({
      ...chart,
      seriesColor: options?.seriesColor,
      decimals: 1,
      subtitle: options?.getSubtitle
        ? options?.getSubtitle(chart.value)
        : getSubtitleFromFormula(chart.value),
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId, options?.seriesColor, options?.getSubtitle]);

  return charts;
};

export const useContainerK8sKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; getSubtitle?: (formulaValue: string) => string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('container');
    const { cpu, memory } = await model.metrics.getCharts();

    return [cpu.metric.containerK8sCpuUsage, memory.metric.containerK8sMemoryUsage].map(
      (chart) => ({
        ...chart,
        seriesColor: options?.seriesColor,
        decimals: 1,
        subtitle: options?.getSubtitle
          ? options?.getSubtitle(chart.value)
          : getSubtitleFromFormula(chart.value),
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
