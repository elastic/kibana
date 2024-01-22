/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { EuiFlexItem } from '@elastic/eui';
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

interface Props {
  assetName: string;
  dateRange: TimeRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

export const MetricsSection = ({ assetName, metricsDataView, logsDataView, dateRange }: Props) => {
  const model = findInventoryModel('host');

  const { value } = useAsync(() => {
    return model.metrics.getDashboards();
  });

  const dashboards = useMemo(
    () => ({
      hosts: value?.assetDetails.get({
        metricsDataView,
        logsDataView,
      }),
      kubernetes: value?.assetDetailsKubernetesNode.get({
        metricsDataView,
      }),
    }),

    [logsDataView, metricsDataView, value?.assetDetails, value?.assetDetailsKubernetesNode]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <Section title={MetricsSectionTitle}>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          data-test-subj="infraAssetDetailsHostMetricsChart"
          charts={dashboards.hosts?.charts ?? []}
          filterFieldName={model.fields.name}
        />
      </Section>
      <Section dependsOn={dashboards?.kubernetes?.dependsOn} title={KubernetesMetricsSectionTitle}>
        <MetricsGrid
          assetName={assetName}
          dateRange={dateRange}
          data-test-subj="infraAssetDetailsKubernetesMetricsChart"
          charts={dashboards.kubernetes?.charts ?? []}
          filterFieldName={model.fields.name}
        />
      </Section>
    </EuiFlexGroup>
  );
};

export const MetricsSectionCompact = ({
  assetName,
  metricsDataView,
  logsDataView,
  dateRange,
}: Props) => {
  const model = findInventoryModel('host');
  const { value } = useAsync(() => {
    return model.metrics.getDashboards();
  });

  const charts = useMemo(
    () =>
      value?.assetDetailsFlyout.get({
        metricsDataView,
        logsDataView,
      }).charts ?? [],
    [metricsDataView, logsDataView, value?.assetDetailsFlyout]
  );

  return (
    <Section title={MetricsSectionTitle}>
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
  children,
}: {
  title: React.FunctionComponent;
  dependsOn?: string[];
  children: React.ReactNode;
}) => {
  const Title = title;
  const { metadata } = useMetadataStateContext();

  const shouldRender = useMemo(
    () =>
      dependsOn.length === 0 ||
      dependsOn.some((p) => (metadata?.features ?? []).some((f) => f.name === p)),
    [dependsOn, metadata?.features]
  );

  return shouldRender ? (
    <EuiFlexGroup gutterSize="m" direction="column">
      <EuiFlexItem grow={false}>
        <Title />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
