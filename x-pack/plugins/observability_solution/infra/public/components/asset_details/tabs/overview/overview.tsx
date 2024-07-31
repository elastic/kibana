/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  MetadataSummaryList,
  MetadataSummaryListCompact,
} from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts/alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';
import { useDataViewsContext } from '../../hooks/use_data_views';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { MetadataErrorCallout } from '../../components/metadata_error_callout';
import { CpuProfilingPrompt } from './kpis/cpu_profiling_prompt';
import { ServicesContent } from './services';
import { MetricsContent } from './metrics/metrics';

export const Overview = () => {
  const { dateRange } = useDatePickerContext();
  const { asset, renderMode } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateContext();
  const { metrics } = useDataViewsContext();
  const isFullPageView = renderMode.mode === 'page';

  const metadataSummarySection = isFullPageView ? (
    <MetadataSummaryList metadata={metadata} loading={metadataLoading} assetType={asset.type} />
  ) : (
    <MetadataSummaryListCompact
      metadata={metadata}
      loading={metadataLoading}
      assetType={asset.type}
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <KPIGrid
          assetId={asset.id}
          assetType={asset.type}
          dateRange={dateRange}
          dataView={metrics.dataView}
        />
        {asset.type === 'host' ? <CpuProfilingPrompt /> : null}
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {fetchMetadataError && !metadataLoading ? <MetadataErrorCallout /> : metadataSummarySection}
        <SectionSeparator />
      </EuiFlexItem>
      {asset.type === 'host' || asset.type === 'container' ? (
        <EuiFlexItem grow={false}>
          <AlertsSummaryContent assetId={asset.id} assetType={asset.type} dateRange={dateRange} />
          <SectionSeparator />
        </EuiFlexItem>
      ) : null}
      {asset.type === 'host' ? (
        <EuiFlexItem grow={false}>
          <ServicesContent hostName={asset.id} dateRange={dateRange} />
          <SectionSeparator />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <MetricsContent
          assetId={asset.id}
          assetType={asset.type}
          dateRange={dateRange}
          dataView={metrics.dataView}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SectionSeparator = () => (
  <EuiHorizontalRule
    margin="m"
    css={css`
      margin-bottom: 0;
    `}
  />
);
