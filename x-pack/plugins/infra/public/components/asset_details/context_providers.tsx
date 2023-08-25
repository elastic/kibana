/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssetDetailsStateProvider } from './hooks/use_asset_details_state';
import { DateRangeProvider } from './hooks/use_date_range';
import { MetadataStateProvider } from './hooks/use_metadata_state';
import { AssetDetailsProps } from './types';

export const ContextProviders = ({
  props,
  children,
}: { props: Omit<AssetDetailsProps, 'links' | 'tabs' | 'activeTabId' | 'metricAlias'> } & {
  children: React.ReactNode;
}) => {
  const { asset, dateRange, overrides, onTabsStateChange, assetType = 'host', renderMode } = props;
  return (
    <DateRangeProvider initialDateRange={dateRange}>
      <MetadataStateProvider asset={asset} assetType={assetType}>
        <AssetDetailsStateProvider
          state={{
            asset,
            assetType,
            overrides,
            onTabsStateChange,
            renderMode,
          }}
        >
          {children}
        </AssetDetailsStateProvider>
      </MetadataStateProvider>
    </DateRangeProvider>
  );
};
