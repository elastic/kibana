/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup } from '@elastic/eui';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import useAsync from 'react-use/lib/useAsync';
import {
  MetricsSectionTitle,
  KubernetesMetricsSectionTitle,
} from '../../../components/section_titles';
import { useMetadataStateContext } from '../../../hooks/use_metadata_state';
import { MetricsGrid } from './metrics_grid';
import { CollapsibleSection } from '../section/collapsible_section';

interface Props {
  assetName: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsSection = ({ assetName, metricsDataView, logsDataView, dateRange }: Props) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { cpuCharts, diskCharts, memoryCharts, networkCharts, logRateCharts } =
      await model.metrics.getCharts();

    return [
      cpuCharts.xy.cpuUsage,
      cpuCharts.xy.cpuUsageBreakdown,
      memoryCharts.xy.memoryUsage,
      memoryCharts.xy.memoryUsageBreakdown,
      cpuCharts.xy.normalizedLoad1m,
      cpuCharts.xy.loadBreakdown,
      logRateCharts.xy.logRate,
      diskCharts.xy.diskSpaceAvailable,
      diskCharts.xy.diskUsageByMountPoint,
      diskCharts.xy.diskThroughputReadWrite,
      diskCharts.xy.diskIOReadWrite,
      networkCharts.xy.rxTx,
    ].map((chart) => {
      const dataViewId = chart.id === 'logRate' ? logsDataView?.id : metricsDataView?.id;
      return {
        ...chart,
        ...(dataViewId
          ? {
              dataset: {
                index: dataViewId,
              },
            }
          : {}),
      };
    });
  }, [metricsDataView?.id, logsDataView?.id]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <Section title={MetricsSectionTitle} collapsible>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          data-test-subj="infraAssetDetailsHostMetricsChart"
          charts={charts}
          filterFieldName={model.fields.name}
        />
      </Section>
      <KubenetesMetricsSection
        assetName={assetName}
        dateRange={dateRange}
        metricsDataView={metricsDataView}
      />
    </EuiFlexGroup>
  );
};

const KubenetesMetricsSection = ({
  assetName,
  metricsDataView,
  dateRange,
}: Omit<Props, 'logsDataView'>) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { kubernetesNodeCharts } = await model.metrics.getCharts();

    return [
      kubernetesNodeCharts.xy.nodeCpuCapacity,
      kubernetesNodeCharts.xy.nodeMemoryCapacity,
      kubernetesNodeCharts.xy.nodeDiskCapacity,
      kubernetesNodeCharts.xy.nodePodCapacity,
    ].map((chart) => {
      return {
        ...chart,
        ...(metricsDataView?.id
          ? {
              dataset: {
                index: metricsDataView.id,
              },
            }
          : {}),
      };
    });
  }, [metricsDataView?.id]);

  return (
    <Section dependsOn={['kubernetes.node']} title={KubernetesMetricsSectionTitle} collapsible>
      <MetricsGrid
        assetName={assetName}
        dateRange={dateRange}
        data-test-subj="infraAssetDetailsKubernetesMetricsChart"
        charts={charts}
        filterFieldName={model.fields.name}
      />
    </Section>
  );
};

export const MetricsSectionCompact = ({
  assetName,
  metricsDataView,
  logsDataView,
  dateRange,
}: Props) => {
  const model = findInventoryModel('host');

  const { value: charts = [] } = useAsync(async () => {
    const { cpuCharts, diskCharts, memoryCharts, networkCharts, logRateCharts } =
      await model.metrics.getCharts();

    return [
      cpuCharts.xy.cpuUsage,
      memoryCharts.xy.memoryUsage,
      logRateCharts.xy.logRate,
      cpuCharts.xy.normalizedLoad1m,
      diskCharts.xy.diskSpaceAvailable,
      diskCharts.xy.diskUsageByMountPoint,
      diskCharts.xy.diskThroughputReadWrite,
      networkCharts.xy.rxTx,
    ].map((chart) => {
      const dataViewId = chart.id === 'logRate' ? logsDataView?.id : metricsDataView?.id;
      return {
        ...chart,
        ...(dataViewId
          ? {
              dataset: {
                index: dataViewId,
              },
            }
          : {}),
      };
    });
  }, [metricsDataView?.id, logsDataView?.id]);

  return (
    <Section title={MetricsSectionTitle} collapsible>
      <MetricsGrid
        assetName={assetName}
        dateRange={dateRange}
        filterFieldName={model.fields.name}
        charts={charts}
        data-test-subj="infraAssetDetailsHostMetricsChart"
      />
    </Section>
  );
};

const Section = ({
  title,
  dependsOn = [],
  collapsible = false,
  children,
}: {
  title: React.FunctionComponent;
  dependsOn?: string[];
  collapsible?: boolean;
  children: React.ReactNode;
}) => {
  const { metadata } = useMetadataStateContext();

  const shouldRender = useMemo(
    () =>
      dependsOn.length === 0 ||
      dependsOn.some((p) => (metadata?.features ?? []).some((f) => f.name === p)),
    [dependsOn, metadata?.features]
  );

  return shouldRender ? (
    <CollapsibleSection
      title={title}
      collapsible={collapsible}
      data-test-subj={`infraAssetDetailsMetrics${collapsible ? 'Collapsible' : 'Section'}`}
      id="metrics"
    >
      {children}
    </CollapsibleSection>
  ) : null;
};
