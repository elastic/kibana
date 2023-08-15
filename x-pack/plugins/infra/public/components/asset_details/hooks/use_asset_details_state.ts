/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { AssetDetailsProps } from '../types';
import { useDateRangeProviderContext } from './use_date_range_provider';
import { useMetadataProviderContext } from './use_metadata_provider';

export interface UseAssetDetailsStateProps {
  state: Pick<
    AssetDetailsProps,
    'asset' | 'assetType' | 'overrides' | 'onTabsStateChange' | 'renderMode'
  >;
}

export function useAssetDetailsState({ state }: UseAssetDetailsStateProps) {
  const { metadata } = useMetadataProviderContext();
  const { dateRange, dateRangeTs } = useDateRangeProviderContext();
  const { asset, assetType, onTabsStateChange, overrides, renderMode } = state;

  const loading = !asset.name && !metadata?.name;

  return {
    asset: {
      ...asset,
      name: asset.name ?? metadata?.name ?? '',
    },
    assetType,
    dateRange,
    dateRangeTs,
    onTabsStateChange,
    overrides,
    renderMode,
    loading,
  };
}

export const AssetDetailsState = createContainer(useAssetDetailsState);
export const [AssetDetailsStateProvider, useAssetDetailsStateContext] = AssetDetailsState;
