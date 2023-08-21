/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import { findInventoryModel } from '../../../../common/inventory_models';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetadata } from './use_metadata';
import { parseDateRange } from '../../../utils/datemath';
import type { AssetDetailsProps } from '../types';
import { toTimestampRange } from '../utils';

const DEFAULT_DATE_RANGE = {
  from: 'now-15m',
  to: 'now',
};

export interface UseAssetDetailsStateProps {
  state: Pick<
    AssetDetailsProps,
    'asset' | 'assetType' | 'overrides' | 'dateRange' | 'onTabsStateChange' | 'renderMode'
  >;
}

export function useAssetDetailsState({ state }: UseAssetDetailsStateProps) {
  const {
    asset,
    assetType,
    dateRange: rawDateRange,
    onTabsStateChange,
    overrides,
    renderMode,
  } = state;

  const dateRange = useMemo(() => {
    const { from = DEFAULT_DATE_RANGE.from, to = DEFAULT_DATE_RANGE.to } =
      parseDateRange(rawDateRange);

    return { from, to };
  }, [rawDateRange]);

  const dateRangeTs = toTimestampRange(dateRange);

  const inventoryModel = findInventoryModel(assetType);
  const { sourceId } = useSourceContext();
  const {
    loading: metadataLoading,
    error: fetchMetadataError,
    metadata,
  } = useMetadata(asset.name, assetType, inventoryModel.requiredMetrics, sourceId, dateRangeTs);

  return {
    asset,
    assetType,
    dateRange,
    dateRangeTs,
    onTabsStateChange,
    overrides,
    renderMode,
    metadataResponse: {
      metadataLoading,
      fetchMetadataError,
      metadata,
    },
  };
}

export const AssetDetailsState = createContainer(useAssetDetailsState);
export const [AssetDetailsStateProvider, useAssetDetailsStateContext] = AssetDetailsState;
