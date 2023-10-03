/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import createContainer from 'constate';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetadata } from './use_metadata';
import { AssetDetailsProps } from '../types';
import { useDateRangeProviderContext } from './use_date_range';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

export type UseMetadataProviderProps = Pick<AssetDetailsProps, 'asset' | 'assetType'>;

export function useMetadataProvider({ asset, assetType }: UseMetadataProviderProps) {
  const [, setUrlState] = useAssetDetailsUrlState();
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const { sourceId } = useSourceContext();

  const { loading, error, metadata, reload } = useMetadata({
    assetId: asset.id,
    assetType,
    sourceId,
    timeRange: getDateRangeInTimestamp(),
  });

  const refresh = useCallback(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (metadata?.name) {
      setUrlState({ name: metadata.name });
    }
  }, [metadata?.name, setUrlState]);

  return {
    loading,
    error,
    metadata,
    refresh,
  };
}

export const [MetadataStateProvider, useMetadataStateProviderContext] =
  createContainer(useMetadataProvider);
