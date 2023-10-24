/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { parseDateRange } from '../../../utils/datemath';
import { AssetDetailsProps } from '../types';
import { getDefaultDateRange, toTimestampRange } from '../utils';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

export type UseDateRangeProviderProps = Pick<AssetDetailsProps, 'autoRefresh' | 'dateRange'>;

export function useDateRangeProvider({
  dateRange = getDefaultDateRange(),
  autoRefresh,
}: UseDateRangeProviderProps) {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [parsedDateRange, setParsedDateRange] = useState(
    parseDateRange(urlState?.dateRange ?? dateRange)
  );
  const [refreshTs, setRefreshTs] = useState(Date.now());

  useEffectOnce(() => {
    setUrlState({
      ...(!urlState?.dateRange
        ? {
            dateRange,
          }
        : undefined),
      ...(!urlState?.autoRefresh ? { autoRefresh } : undefined),
    });
  });

  const setDateRange = useCallback(
    (newDateRange: TimeRange) => {
      setUrlState({ dateRange: newDateRange });
      setParsedDateRange(parseDateRange(newDateRange));
      setRefreshTs(Date.now());
    },
    [setUrlState]
  );

  const setAutoRefresh = useCallback(
    (newAutoRefresh: AssetDetailsProps['autoRefresh']) => {
      setUrlState({
        autoRefresh: newAutoRefresh,
      });
    },
    [setUrlState]
  );

  const getParsedDateRange = useCallback(() => {
    const defaultDateRange = getDefaultDateRange();
    const { from = defaultDateRange.from, to = defaultDateRange.to } = parsedDateRange;

    return { from, to };
  }, [parsedDateRange]);

  const getDateRangeInTimestamp = useCallback(
    () => toTimestampRange(getParsedDateRange()),
    [getParsedDateRange]
  );

  return {
    autoRefresh: urlState?.autoRefresh ?? autoRefresh,
    dateRange: urlState?.dateRange ?? dateRange,
    getDateRangeInTimestamp,
    getParsedDateRange,
    refreshTs,
    setAutoRefresh,
    setDateRange,
  };
}

export const [DateRangeProvider, useDateRangeProviderContext] =
  createContainer(useDateRangeProvider);
