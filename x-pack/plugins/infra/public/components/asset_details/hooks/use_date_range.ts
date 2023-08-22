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
import { toTimestampRange } from '../utils';

const DEFAULT_DATE_RANGE = {
  from: 'now-15m',
  to: 'now',
};

export type UseAssetDetailsStateProps = Pick<AssetDetailsProps, 'dateRange'>;

export function useDateRangeProvider({ dateRange: rawDateRange }: UseAssetDetailsStateProps) {
  const dateRange = useMemo(() => {
    const { from = DEFAULT_DATE_RANGE.from, to = DEFAULT_DATE_RANGE.to } =
      parseDateRange(rawDateRange);

    return { from, to };
  }, [rawDateRange]);

  const dateRangeTs = toTimestampRange(dateRange);

  return {
    dateRange,
    dateRangeTs,
  };
}

export const [DateRangeProvider, useDateRangeProviderContext] =
  createContainer(useDateRangeProvider);
