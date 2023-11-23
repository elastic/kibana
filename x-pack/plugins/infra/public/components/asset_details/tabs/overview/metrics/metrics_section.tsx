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
import { findInventoryModel, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { capitalize } from 'lodash';
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

const ASSET_TYPES: Array<Extract<InventoryItemType, 'host' | 'node'>> = ['host', 'node'];
const TitleComponent = {
  host: MetricsSectionTitle,
  node: KubernetesMetricsSectionTitle,
};

export const MetricsSection = ({ assetName, metricsDataView, logsDataView, dateRange }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {ASSET_TYPES.map((assetType) => (
        <Wrapper
          assetName={assetName}
          assetType={assetType}
          metricsDataView={metricsDataView}
          logsDataView={logsDataView}
          dateRange={dateRange}
        />
      ))}
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

  const charts = useMemo(
    () =>
      (metricsDataView && logsDataView
        ? model.metrics.dashboards?.assetDetailsFlyout.get({
            metricsDataView,
            logsDataView,
          }).charts
        : []) ?? [],
    [metricsDataView, logsDataView, model.metrics.dashboards?.assetDetailsFlyout]
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

const Wrapper = ({
  assetName,
  assetType,
  dateRange,
  metricsDataView,
  logsDataView,
}: {
  assetType: Extract<InventoryItemType, 'host' | 'node'>;
} & Props) => {
  const model = findInventoryModel(assetType);

  const dashboard = useMemo(
    () =>
      metricsDataView && logsDataView
        ? model.metrics.dashboards?.assetDetails.get({
            metricsDataView,
            logsDataView,
          })
        : null,
    [metricsDataView, logsDataView, model.metrics.dashboards?.assetDetails]
  );

  return (
    <Section dependsOn={dashboard?.dependsOn} title={TitleComponent[assetType]}>
      <MetricsGrid
        assetName={assetName}
        dateRange={dateRange}
        data-test-subj={`infraAssetDetails${capitalize(assetType)}MetricsChart`}
        charts={dashboard?.charts ?? []}
        filterFieldName={model.fields.name}
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
