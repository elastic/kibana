/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  MetadataSummaryList,
  MetadataSummaryListCompact,
} from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { MetricsSection, MetricsSectionCompact } from './metrics/metrics_section';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { SectionSeparator } from './section_separator';
import { MetadataErrorCallout } from '../../components/metadata_error_callout';
import { useIntersectingState } from '../../hooks/use_intersecting_state';
import { CpuProfilingPrompt } from './kpis/cpu_profiling_prompt';
import { ServicesContent } from './services';

export const Overview = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { dateRange } = useDatePickerContext();
  const { asset, renderMode } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateContext();
  const { logs, metrics } = useDataViewsContext();

  const isFullPageView = renderMode.mode === 'page';

  const state = useIntersectingState(ref, { dateRange });

  const metricsSection = isFullPageView ? (
    <MetricsSection
      dateRange={state.dateRange}
      logsDataView={logs.dataView}
      metricsDataView={metrics.dataView}
      assetName={asset.name}
    />
  ) : (
    <MetricsSectionCompact
      dateRange={state.dateRange}
      logsDataView={logs.dataView}
      metricsDataView={metrics.dataView}
      assetName={asset.name}
    />
  );
  const metadataSummarySection = isFullPageView ? (
    <MetadataSummaryList metadata={metadata} loading={metadataLoading} />
  ) : (
    <MetadataSummaryListCompact metadata={metadata} loading={metadataLoading} />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" ref={ref}>
      <EuiFlexItem grow={false}>
        <KPIGrid assetName={asset.name} dateRange={state.dateRange} dataView={metrics.dataView} />
        <CpuProfilingPrompt />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {fetchMetadataError && !metadataLoading ? <MetadataErrorCallout /> : metadataSummarySection}
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AlertsSummaryContent
          assetName={asset.name}
          assetType={asset.type}
          dateRange={state.dateRange}
        />
        <SectionSeparator />
      </EuiFlexItem>
      {asset.type === 'host' ? (
        <EuiFlexItem grow={false}>
          <ServicesContent hostName={asset.name} dateRange={state.dateRange} />
          <SectionSeparator />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>{metricsSection}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
