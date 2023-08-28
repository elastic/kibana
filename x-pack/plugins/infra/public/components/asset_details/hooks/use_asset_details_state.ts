/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { AssetDetailsProps } from '../types';
import { useMetadataStateProviderContext } from './use_metadata_state';

export interface UseAssetDetailsStateProps {
  state: Pick<
    AssetDetailsProps,
    'asset' | 'assetType' | 'overrides' | 'onTabsStateChange' | 'renderMode'
  >;
}

export function useAssetDetailsState({ state }: UseAssetDetailsStateProps) {
  const { metadata } = useMetadataStateProviderContext();
  const { asset, assetType, onTabsStateChange, overrides, renderMode } = state;

  // When the asset asset.name is known we can load the page faster
  // Otherwise we need to use metadata response.
  const loading = !asset.name && !metadata?.name;

  return {
    asset: {
      ...asset,
      name: asset.name || metadata?.name || 'asset-name',
    },
    assetType,
    onTabsStateChange,
    overrides,
    renderMode,
    loading,
  };
}

export const AssetDetailsState = createContainer(useAssetDetailsState);
export const [AssetDetailsStateProvider, useAssetDetailsStateContext] = AssetDetailsState;
