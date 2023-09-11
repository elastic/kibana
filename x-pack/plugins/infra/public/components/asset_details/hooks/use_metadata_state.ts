/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import createContainer from 'constate';
import { findInventoryModel } from '../../../../common/inventory_models';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetadata } from './use_metadata';
import { AssetDetailsProps } from '../types';
import { useDateRangeProviderContext } from './use_date_range';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

export type UseMetadataProviderProps = Pick<AssetDetailsProps, 'asset' | 'assetType'>;

export function useMetadataProvider({ asset, assetType }: UseMetadataProviderProps) {
  const [, setUrlState] = useAssetDetailsUrlState();
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const inventoryModel = findInventoryModel(assetType);
  const { sourceId } = useSourceContext();

  const { loading, error, metadata } = useMetadata(
    asset.id,
    assetType,
    inventoryModel.requiredMetrics,
    sourceId,
    getDateRangeInTimestamp()
  );

  useEffect(() => {
    if (metadata?.name) {
      setUrlState({ name: metadata.name });
    }
  }, [metadata?.name, setUrlState]);

  return {
    loading,
    error,
    metadata,
  };
}

export const [MetadataStateProvider, useMetadataStateProviderContext] =
  createContainer(useMetadataProvider);
