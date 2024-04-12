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
import {
  MetricsSectionTitle,
  KubernetesMetricsSectionTitle,
} from '../../../components/section_titles';
import { useMetadataStateContext } from '../../../hooks/use_metadata_state';
import { MetricsGrid } from './metrics_grid';
import { CollapsibleSection } from '../section/collapsible_section';
import {
  useContainerPageViewMetricsCharts,
  useHostFlyoutViewMetricsCharts,
  useHostPageViewMetricsCharts,
  useKubernetesSectionMetricsCharts,
} from '../../../hooks/use_metrics_charts';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
  assetType?: string;
}

export const MetricsSection = (props: Props) => {
  if (props.assetType === 'container') {
    return <ContainerMetricsSection {...props} />;
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <HostMetricsSection {...props} />
      <KubenetesMetricsSection {...props} />
    </EuiFlexGroup>
  );
};

export const MetricsSectionCompact = ({
  assetId,
  metricsDataView,
  logsDataView,
  dateRange,
}: Props) => {
  const model = findInventoryModel('host');
  const charts = useHostFlyoutViewMetricsCharts({
    metricsDataViewId: metricsDataView?.id,
    logsDataViewId: logsDataView?.id,
  });

  return (
    <Section title={MetricsSectionTitle} collapsible>
      <MetricsGrid
        assetId={assetId}
        dateRange={dateRange}
        queryField={model.fields.name}
        charts={charts}
        data-test-subj="infraAssetDetailsHostMetricsChart"
      />
    </Section>
  );
};

const HostMetricsSection = ({ assetId, metricsDataView, logsDataView, dateRange }: Props) => {
  const model = findInventoryModel('host');
  const charts = useHostPageViewMetricsCharts({
    metricsDataViewId: metricsDataView?.id,
    logsDataViewId: logsDataView?.id,
  });

  return (
    <Section title={MetricsSectionTitle} collapsible>
      <MetricsGrid
        assetId={assetId}
        dateRange={dateRange}
        data-test-subj="infraAssetDetailsHostMetricsChart"
        charts={charts}
        queryField={model.fields.id}
      />
    </Section>
  );
};

const KubenetesMetricsSection = ({
  assetId,
  metricsDataView,
  dateRange,
}: Omit<Props, 'logsDataView'>) => {
  const model = findInventoryModel('host');
  const charts = useKubernetesSectionMetricsCharts({ metricsDataViewId: metricsDataView?.id });

  return (
    <Section dependsOn={['kubernetes.node']} title={KubernetesMetricsSectionTitle} collapsible>
      <MetricsGrid
        assetId={assetId}
        dateRange={dateRange}
        data-test-subj="infraAssetDetailsKubernetesMetricsChart"
        charts={charts}
        queryField={model.fields.name}
      />
    </Section>
  );
};

const ContainerMetricsSection = ({
  assetId,
  metricsDataView,
  dateRange,
}: Omit<Props, 'logsDataView'>) => {
  const model = findInventoryModel('container');
  const charts = useContainerPageViewMetricsCharts({
    metricsDataViewId: metricsDataView?.id,
  });

  return (
    <Section title={MetricsSectionTitle} collapsible>
      <MetricsGrid
        assetId={assetId}
        dateRange={dateRange}
        data-test-subj="infraAssetDetailsContainerMetricsChart"
        charts={charts}
        queryField={model.fields.name}
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
