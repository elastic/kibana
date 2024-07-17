/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { BehaviorSubject } from 'rxjs';
import { useSearchSessionContext } from '../../../hooks/use_search_session';
import { parseDateRange } from '../../../utils/datemath';
import { AssetDetailsProps } from '../types';
import { getDefaultDateRange, toTimestampRange } from '../utils';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

export type UseDateRangeProviderProps = Pick<AssetDetailsProps, 'autoRefresh' | 'dateRange'>;

export function useDatePicker({
  dateRange = getDefaultDateRange(),
  autoRefresh,
}: UseDateRangeProviderProps) {
  const { updateSearchSessionId } = useSearchSessionContext();
  const autoRefreshTick$ = useMemo(() => new BehaviorSubject(null), []);
  const autoRefreshConfig$ = useMemo(
    () => new BehaviorSubject<UseDateRangeProviderProps['autoRefresh'] | undefined>(undefined),
    []
  );

  const autoRefreshEnabled = autoRefresh && !autoRefresh.isPaused;

  const [urlState, setUrlState] = useAssetDetailsUrlState();
  const [parsedDateRange, setParsedDateRange] = useState(
    parseDateRange(urlState?.dateRange ?? dateRange)
  );

  useEffectOnce(() => {
    autoRefreshConfig$.next(urlState?.autoRefresh ? urlState.autoRefresh : autoRefresh);
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
    },
    [setUrlState]
  );

  const onRefresh = useCallback(
    (newDateRange: TimeRange) => {
      // auto-refresh updates the search session id when the date range changes
      if (autoRefreshEnabled) {
        autoRefreshTick$.next(null);
      } else {
        updateSearchSessionId();
      }

      setDateRange(newDateRange);
    },
    [autoRefreshEnabled, autoRefreshTick$, setDateRange, updateSearchSessionId]
  );

  const setAutoRefresh = useCallback(
    (newAutoRefresh: AssetDetailsProps['autoRefresh']) => {
      autoRefreshConfig$.next(newAutoRefresh);
      setUrlState({
        autoRefresh: newAutoRefresh,
      });
    },
    [autoRefreshConfig$, setUrlState]
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
    autoRefreshTick$,
    autoRefreshConfig$,
    dateRange: urlState?.dateRange ?? dateRange,
    getDateRangeInTimestamp,
    getParsedDateRange,
    onRefresh,
    setAutoRefresh,
    setDateRange,
  };
}

export const [DatePickerProvider, useDatePickerContext] = createContainer(useDatePicker);
