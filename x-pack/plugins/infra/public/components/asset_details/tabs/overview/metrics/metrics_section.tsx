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

  const { value } = useAsync(() => {
    return model.metrics.getDashboards();
  });

  const dashboards = useMemo(
    () => ({
      hosts: value?.assetDetails.get({
        metricsDataViewId: metricsDataView?.id,
        logsDataViewId: logsDataView?.id,
      }),
      kubernetes: value?.assetDetailsKubernetesNode.get({
        metricsDataViewId: metricsDataView?.id,
      }),
    }),

    [logsDataView?.id, metricsDataView?.id, value?.assetDetails, value?.assetDetailsKubernetesNode]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <Section title={MetricsSectionTitle} collapsible>
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
        metricsDataViewId: metricsDataView?.id,
        logsDataViewId: logsDataView?.id,
      }).charts ?? [],
    [logsDataView?.id, metricsDataView?.id, value?.assetDetailsFlyout]
  );

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
