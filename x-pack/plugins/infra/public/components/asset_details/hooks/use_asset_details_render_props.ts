/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import type { AssetDetailsProps } from '../types';
import { useMetadataStateProviderContext } from './use_metadata_state';

export interface UseAssetDetailsRenderProps {
  props: Pick<AssetDetailsProps, 'asset' | 'assetType' | 'overrides' | 'renderMode'>;
}

export function useAssetDetailsRenderProps({ props }: UseAssetDetailsRenderProps) {
  const { metadata } = useMetadataStateProviderContext();
  const { asset, assetType, overrides, renderMode } = props;

  // When the asset asset.name is known we can load the page faster
  // Otherwise we need to use metadata response.
  const loading = !asset.name && !metadata?.name;

  return {
    asset: {
      ...asset,
      name: asset.name || metadata?.name || 'asset-name',
    },
    assetType,
    overrides,
    renderMode,
    loading,
  };
}

export const AssetDetailsRenderProps = createContainer(useAssetDetailsRenderProps);
export const [AssetDetailsRenderPropsProvider, useAssetDetailsRenderPropsContext] =
  AssetDetailsRenderProps;
