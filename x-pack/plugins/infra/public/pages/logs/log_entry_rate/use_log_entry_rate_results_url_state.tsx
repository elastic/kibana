/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import * as rt from 'io-ts';
import { TimeRange } from '../../../../../../../src/plugins/data/public';
import { useUrlState } from '../../../utils/use_url_state';
import {
  useKibanaTimefilterTime,
  useSyncKibanaTimeFilterTime,
} from '../../../hooks/use_kibana_timefilter_time';
import { decodeOrThrow } from '../../../../common/runtime_types';

const autoRefreshRT = rt.type({
  interval: rt.number,
  isPaused: rt.boolean,
});

export type AutoRefresh = rt.TypeOf<typeof autoRefreshRT>;
const urlAutoRefreshRT = rt.union([autoRefreshRT, rt.undefined]);
const decodeAutoRefreshUrlState = decodeOrThrow(urlAutoRefreshRT);
const defaultAutoRefreshState = {
  isPaused: false,
  interval: 30000,
};

export const stringTimeRangeRT = rt.type({
  startTime: rt.string,
  endTime: rt.string,
});
export type StringTimeRange = rt.TypeOf<typeof stringTimeRangeRT>;

const urlTimeRangeRT = rt.union([stringTimeRangeRT, rt.undefined]);
const decodeTimeRangeUrlState = decodeOrThrow(urlTimeRangeRT);

const TIME_RANGE_URL_STATE_KEY = 'timeRange';
const AUTOREFRESH_URL_STATE_KEY = 'autoRefresh';
const TIME_DEFAULTS = { from: 'now-2w', to: 'now' };

export const useLogAnalysisResultsUrlState = () => {
  const [getTime] = useKibanaTimefilterTime(TIME_DEFAULTS);
  const { from: start, to: end } = getTime();

  const defaultTimeRangeState = useMemo(() => {
    return {
      startTime: start,
      endTime: end,
    };
  }, [start, end]);

  const [timeRange, setTimeRange] = useUrlState({
    defaultState: defaultTimeRangeState,
    decodeUrlState: decodeTimeRangeUrlState,
    encodeUrlState: urlTimeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
    writeDefaultState: true,
  });

  const handleTimeFilterChange = useCallback(
    (newTimeRange: TimeRange) => {
      const { from, to } = newTimeRange;
      setTimeRange({ startTime: from, endTime: to });
    },
    [setTimeRange]
  );

  useSyncKibanaTimeFilterTime(
    TIME_DEFAULTS,
    { from: timeRange.startTime, to: timeRange.endTime },
    handleTimeFilterChange
  );

  const [autoRefresh, setAutoRefresh] = useUrlState({
    defaultState: defaultAutoRefreshState,
    decodeUrlState: decodeAutoRefreshUrlState,
    encodeUrlState: urlAutoRefreshRT.encode,
    urlStateKey: AUTOREFRESH_URL_STATE_KEY,
    writeDefaultState: true,
  });

  return {
    timeRange,
    setTimeRange,
    autoRefresh,
    setAutoRefresh,
  };
};
