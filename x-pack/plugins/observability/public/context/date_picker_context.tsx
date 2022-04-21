/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useState, useMemo, useCallback } from 'react';
import useMount from 'react-use/lib/useMount';
import { useLocation, useHistory } from 'react-router-dom';
import { parse } from 'query-string';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { fromQuery, ObservabilityPublicPluginsStart, toQuery } from '..';
import { getAbsoluteTime } from '../utils/date';

export interface DatePickerContextValue {
  relativeStart: string;
  relativeEnd: string;
  absoluteStart?: number;
  absoluteEnd?: number;
  refreshInterval: number;
  refreshPaused: boolean;
  updateTimeRange: (params: { start: string; end: string }) => void;
  updateRefreshInterval: (params: { interval: number; isPaused: boolean }) => void;
  lastUpdated: number;
}

/**
 * This context contains the time range (both relative and absolute) and the
 * autorefresh status of the overview page date picker.
 * It also updates the URL when any of the values change
 */
export const DatePickerContext = createContext({} as DatePickerContextValue);

export function DatePickerContextProvider({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const history = useHistory();

  const updateUrl = useCallback(
    (nextQuery: {
      rangeFrom?: string;
      rangeTo?: string;
      refreshPaused?: boolean;
      refreshInterval?: number;
    }) => {
      history.push({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          ...nextQuery,
        }),
      });
    },
    [history, location]
  );

  const [lastUpdated, setLastUpdated] = useState(Date.now());

  const { data } = useKibana<ObservabilityPublicPluginsStart>().services;

  const defaultTimeRange = data.query.timefilter.timefilter.getTimeDefaults();
  const sharedTimeRange = data.query.timefilter.timefilter.getTime();
  const defaultRefreshInterval = data.query.timefilter.timefilter.getRefreshIntervalDefaults();
  const sharedRefreshInterval = data.query.timefilter.timefilter.getRefreshInterval();

  const {
    rangeFrom = sharedTimeRange.from ?? defaultTimeRange.from,
    rangeTo = sharedTimeRange.to ?? defaultTimeRange.to,
    refreshInterval = sharedRefreshInterval.value || defaultRefreshInterval.value || 10000, // we want to override a default of 0
    refreshPaused = sharedRefreshInterval.pause ?? defaultRefreshInterval.pause,
  } = parse(location.search, {
    sort: false,
  });

  const relativeStart = rangeFrom as string;
  const relativeEnd = rangeTo as string;

  const absoluteStart = useMemo(
    () => getAbsoluteTime(relativeStart),
    // `lastUpdated` works as a cache buster
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relativeStart, lastUpdated]
  );

  const absoluteEnd = useMemo(
    () => getAbsoluteTime(relativeEnd, { roundUp: true }),
    // `lastUpdated` works as a cache buster
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relativeEnd, lastUpdated]
  );

  const updateTimeRange = useCallback(
    ({ start, end }: { start: string; end: string }) => {
      data.query.timefilter.timefilter.setTime({ from: start, to: end });
      updateUrl({ rangeFrom: start, rangeTo: end });
      setLastUpdated(Date.now());
    },
    [data.query.timefilter.timefilter, updateUrl]
  );

  const updateRefreshInterval = useCallback(
    ({ interval, isPaused }) => {
      updateUrl({ refreshInterval: interval, refreshPaused: isPaused });
      data.query.timefilter.timefilter.setRefreshInterval({ value: interval, pause: isPaused });
      setLastUpdated(Date.now());
    },
    [data.query.timefilter.timefilter, updateUrl]
  );

  useMount(() => {
    updateUrl({ rangeFrom: relativeStart, rangeTo: relativeEnd });
  });

  return (
    <DatePickerContext.Provider
      value={{
        relativeStart,
        relativeEnd,
        absoluteStart,
        absoluteEnd,
        refreshInterval: parseRefreshInterval(refreshInterval),
        refreshPaused: parseRefreshPaused(refreshPaused),
        updateTimeRange,
        updateRefreshInterval,
        lastUpdated,
      }}
    >
      {children}
    </DatePickerContext.Provider>
  );
}

function parseRefreshInterval(value: string | string[] | number | null): number {
  switch (typeof value) {
    case 'number':
      return value;
    case 'string':
      return parseInt(value, 10) || 0;
    default:
      return 0;
  }
}

function parseRefreshPaused(value: string | string[] | boolean | null): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  switch (value) {
    case 'false':
      return false;
    case 'true':
    default:
      return true;
  }
}
