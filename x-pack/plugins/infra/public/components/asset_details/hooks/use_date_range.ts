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
import { getDefaultDateRange, toTimestampRange } from '../utils';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

export interface UseDateRangeProviderProps {
  initialDateRange: TimeRange;
}

export function useDateRangeProvider({
  initialDateRange = getDefaultDateRange(),
}: UseDateRangeProviderProps) {
  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const dateRange: TimeRange = urlState?.dateRange ?? initialDateRange;
  const [parsedDateRange, setParsedDateRange] = useState(parseDateRange(dateRange));
  const [refreshTs, setRefreshTs] = useState(Date.now());

  useEffectOnce(() => {
    const { from, to } = getParsedDateRange();

    // forces the date picker to initialize with absolute dates.
    setUrlState({ dateRange: { from, to } });
  });

  const setDateRange = useCallback(
    (newDateRange: TimeRange) => {
      setUrlState({ dateRange: newDateRange });
      setParsedDateRange(parseDateRange(newDateRange));
      setRefreshTs(Date.now());
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
    dateRange,
    getDateRangeInTimestamp,
    getParsedDateRange,
    refreshTs,
    setDateRange,
  };
}

export const [DateRangeProvider, useDateRangeProviderContext] =
  createContainer(useDateRangeProvider);
