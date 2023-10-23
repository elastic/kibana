/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssetDetailsRenderPropsProvider } from './hooks/use_asset_details_render_props';
import { DateRangeProvider } from './hooks/use_date_range';
import { MetadataStateProvider } from './hooks/use_metadata_state';
import { AssetDetailsProps } from './types';

export const ContextProviders = ({
  children,
  ...props
}: Omit<AssetDetailsProps, 'links' | 'tabs' | 'activeTabId' | 'metricAlias'> & {
  children: React.ReactNode;
}) => {
  const {
    assetId,
    assetName,
    autoRefresh,
    dateRange,
    overrides,
    assetType = 'host',
    renderMode,
  } = props;

  return (
    <DateRangeProvider dateRange={dateRange} autoRefresh={autoRefresh}>
      <MetadataStateProvider assetId={assetId} assetType={assetType}>
        <AssetDetailsRenderPropsProvider
          assetId={assetId}
          assetName={assetName}
          assetType={assetType}
          overrides={overrides}
          renderMode={renderMode}
        >
          {children}
        </AssetDetailsRenderPropsProvider>
      </MetadataStateProvider>
    </DateRangeProvider>
  );
};
