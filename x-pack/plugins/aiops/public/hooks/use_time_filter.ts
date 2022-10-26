/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { useAiopsAppContext } from './use_aiops_app_context';

interface UseTimefilterOptions {
  timeRangeSelector?: boolean;
  autoRefreshSelector?: boolean;
}

export const useTimefilter = ({
  timeRangeSelector,
  autoRefreshSelector,
}: UseTimefilterOptions = {}) => {
  const {
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
  } = useAiopsAppContext();

  useEffect(() => {
    if (timeRangeSelector === true && !timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.enableTimeRangeSelector();
    } else if (timeRangeSelector === false && timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.disableTimeRangeSelector();
    }

    if (autoRefreshSelector === true && !timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.enableAutoRefreshSelector();
    } else if (autoRefreshSelector === false && timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.disableAutoRefreshSelector();
    }
  }, [timeRangeSelector, autoRefreshSelector, timefilter]);

  return timefilter;
};

export const useRefreshIntervalUpdates = () => {
  const timefilter = useTimefilter();

  const refreshIntervalObservable$ = useMemo(
    () => timefilter.getRefreshIntervalUpdate$().pipe(map(timefilter.getRefreshInterval)),
    [timefilter]
  );

  return useObservable(refreshIntervalObservable$, timefilter.getRefreshInterval());
};

export const useTimeRangeUpdates = (absolute = false) => {
  const timefilter = useTimefilter();

  const getTimeCallback = useMemo(() => {
    return absolute
      ? timefilter.getAbsoluteTime.bind(timefilter)
      : timefilter.getTime.bind(timefilter);
  }, [absolute, timefilter]);

  const timeChangeObservable$ = useMemo(
    () => timefilter.getTimeUpdate$().pipe(map(getTimeCallback), distinctUntilChanged(isEqual)),
    [timefilter, getTimeCallback]
  );

  return useObservable(timeChangeObservable$, getTimeCallback());
};
