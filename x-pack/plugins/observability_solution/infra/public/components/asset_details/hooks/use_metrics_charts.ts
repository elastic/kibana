/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';

export const useHostFlyoutViewMetricsCharts = ({
  metricsDataViewId,
  logsDataViewId,
}: {
  metricsDataViewId?: string;
  logsDataViewId?: string;
}) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { cpu, disk, memory, network, logs } = await model.metrics.getCharts();

    return [
      cpu.xy.cpuUsage,
      memory.xy.memoryUsage,
      cpu.xy.normalizedLoad1m,
      logs.xy.logRate,
      disk.xy.diskSpaceUsageAvailable,
      disk.xy.diskUsageByMountPoint,
      disk.xy.diskThroughputReadWrite,
      disk.xy.diskIOReadWrite,
      network.xy.rxTx,
    ].map((chart) => {
      const dataViewId = chart.id === 'logRate' ? logsDataViewId : metricsDataViewId;
      return {
        ...chart,
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      };
    });
  }, [metricsDataViewId, logsDataViewId]);

  return charts;
};

export const useHostPageViewMetricsCharts = ({
  metricsDataViewId,
  logsDataViewId,
}: {
  metricsDataViewId?: string;
  logsDataViewId?: string;
}) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { cpu, disk, memory, network, logs } = await model.metrics.getCharts();

    return [
      cpu.xy.cpuUsage,
      cpu.xy.cpuUsageBreakdown,
      memory.xy.memoryUsage,
      memory.xy.memoryUsageBreakdown,
      cpu.xy.normalizedLoad1m,
      cpu.xy.loadBreakdown,
      logs.xy.logRate,
      disk.xy.diskSpaceUsageAvailable,
      disk.xy.diskUsageByMountPoint,
      disk.xy.diskThroughputReadWrite,
      disk.xy.diskIOReadWrite,
      network.xy.rxTx,
    ].map((chart) => {
      const dataViewId = chart.id === 'logRate' ? logsDataViewId : metricsDataViewId;
      return {
        ...chart,
        ...(dataViewId && {
          dataset: {
            index: dataViewId,
          },
        }),
      };
    });
  }, [metricsDataViewId, logsDataViewId]);

  return charts;
};

export const useKubernetesSectionMetricsCharts = ({
  metricsDataViewId,
}: {
  metricsDataViewId?: string;
}) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { kibernetesNode } = await model.metrics.getCharts();

    return [
      kibernetesNode.xy.nodeCpuCapacity,
      kibernetesNode.xy.nodeMemoryCapacity,
      kibernetesNode.xy.nodeDiskCapacity,
      kibernetesNode.xy.nodePodCapacity,
    ].map((chart) => {
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

  return charts;
};

export const useHostKpiCharts = ({
  dataViewId,
  options,
}: {
  dataViewId?: string;
  options?: { seriesColor: string; subtitle?: string };
}) => {
  const { value: charts = [] } = useAsync(async () => {
    const model = findInventoryModel('host');
    const { cpu, disk, memory } = await model.metrics.getCharts();

    return [
      cpu.metric.cpuUsage,
      cpu.metric.normalizedLoad1m,
      memory.metric.memoryUsage,
      disk.metric.diskUsage,
    ].map((chart) => ({
      ...chart,
      seriesColor: options?.seriesColor,
      decimals: 1,
      subtitle:
        options?.subtitle ??
        i18n.translate('xpack.infra.assetDetails.kpi.subtitle.average', {
          defaultMessage: 'Average',
        }),
      ...(dataViewId && {
        dataset: {
          index: dataViewId,
        },
      }),
    }));
  }, [dataViewId, options?.seriesColor, options?.subtitle]);

  return charts;
};

export const useContainerPageViewMetricsCharts = ({
  metricsDataViewId,
}: {
  metricsDataViewId?: string;
}) => {
  const model = findInventoryModel('container');

  const { value: charts = [] } = useAsync(async () => {
    const { cpu, memory } = await model.metrics.getCharts();

    return [cpu.xy.cpuUsage, memory.xy.memoryUsage].map((chart) => {
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

  return charts;
};
