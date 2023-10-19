/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  MetadataSummaryList,
  MetadataSummaryListCompact,
} from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { MetricsSection, MetricsSectionCompact } from './metrics/metrics_section';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';
import { useDataViewsProviderContext } from '../../hooks/use_data_views';
import { useDateRangeProviderContext } from '../../hooks/use_date_range';
import { SectionSeparator } from './section_separator';
import { MetadataErrorCallout } from '../../components/metadata_error_callout';

export const Overview = () => {
  const { getParsedDateRange } = useDateRangeProviderContext();
  const { asset, assetType, renderMode } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateProviderContext();
  const { logs, metrics } = useDataViewsProviderContext();

  const parsedDateRange = useMemo(() => getParsedDateRange(), [getParsedDateRange]);
  const isFullPageView = renderMode.mode !== 'flyout';

  const metricsSection = isFullPageView ? (
    <MetricsSection
      dateRange={parsedDateRange}
      logsDataView={logs.dataView}
      metricsDataView={metrics.dataView}
      assetName={asset.name}
    />
  ) : (
    <MetricsSectionCompact
      dateRange={parsedDateRange}
      logsDataView={logs.dataView}
      metricsDataView={metrics.dataView}
      assetName={asset.name}
    />
  );
  const metadataSummarySection = isFullPageView ? (
    <MetadataSummaryList metadata={metadata} metadataLoading={metadataLoading} />
  ) : (
    <MetadataSummaryListCompact metadata={metadata} metadataLoading={metadataLoading} />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <KPIGrid assetName={asset.name} dateRange={parsedDateRange} dataView={metrics.dataView} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {fetchMetadataError && !metadataLoading ? <MetadataErrorCallout /> : metadataSummarySection}
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AlertsSummaryContent
          assetName={asset.name}
          assetType={assetType}
          dateRange={parsedDateRange}
        />
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{metricsSection}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
