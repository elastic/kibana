/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useMemo } from 'react';
import { parseDateRange } from '../../../utils/datemath';
import type { AssetDetailsProps } from '../types';

const DEFAULT_DATE_RANGE = {
  from: 'now-15m',
  to: 'now',
};

export interface UseAssetDetailsStateProps {
  state: Pick<
    AssetDetailsProps,
    'node' | 'nodeType' | 'overrides' | 'dateRange' | 'onTabsStateChange'
  >;
}

export function useAssetDetailsState({ state }: UseAssetDetailsStateProps) {
  const { node, nodeType, dateRange: rawDateRange, onTabsStateChange, overrides } = state;

  const dateRange = useMemo(() => {
    const { from = DEFAULT_DATE_RANGE.from, to = DEFAULT_DATE_RANGE.to } =
      parseDateRange(rawDateRange);

    return { from, to };
  }, [rawDateRange]);

  return {
    node,
    nodeType,
    dateRange,
    onTabsStateChange,
    overrides,
  };
}

export const AssetDetailsState = createContainer(useAssetDetailsState);
export const [AssetDetailsStateProvider, useAssetDetailsStateContext] = AssetDetailsState;
