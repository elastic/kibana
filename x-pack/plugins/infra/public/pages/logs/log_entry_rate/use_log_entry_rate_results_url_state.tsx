/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import datemath from '@kbn/datemath';
import moment from 'moment';
import * as rt from 'io-ts';
import { TimeRange as KibanaTimeRange } from '../../../../../../../src/plugins/data/public';
import { TimeRange } from '../../../../common/time/time_range';
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

  const [urlTimeRange, setUrlTimeRange] = useUrlState({
    defaultState: defaultTimeRangeState,
    decodeUrlState: decodeTimeRangeUrlState,
    encodeUrlState: urlTimeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
    writeDefaultState: true,
  });

  // Numeric time range for querying APIs
  const [queryTimeRange, setQueryTimeRange] = useState<{
    value: TimeRange;
    lastChangedTime: number;
  }>(() => ({
    value: stringToNumericTimeRange({ start: urlTimeRange.startTime, end: urlTimeRange.endTime }),
    lastChangedTime: Date.now(),
  }));

  const handleQueryTimeRangeChange = useCallback(
    ({ start: startTime, end: endTime }: { start: string; end: string }) => {
      setQueryTimeRange({
        value: stringToNumericTimeRange({ start: startTime, end: endTime }),
        lastChangedTime: Date.now(),
      });
    },
    [setQueryTimeRange]
  );

  const setTimeRange = useCallback(
    (selectedTime: { start: string; end: string }) => {
      setUrlTimeRange({
        startTime: selectedTime.start,
        endTime: selectedTime.end,
      });
      handleQueryTimeRangeChange(selectedTime);
    },
    [setUrlTimeRange, handleQueryTimeRangeChange]
  );

  const handleTimeFilterChange = useCallback(
    (newTimeRange: KibanaTimeRange) => {
      const { from, to } = newTimeRange;
      setTimeRange({ start: from, end: to });
    },
    [setTimeRange]
  );

  useSyncKibanaTimeFilterTime(
    TIME_DEFAULTS,
    { from: urlTimeRange.startTime, to: urlTimeRange.endTime },
    handleTimeFilterChange
  );

  const [autoRefresh, setAutoRefresh] = useUrlState({
    defaultState: defaultAutoRefreshState,
    decodeUrlState: decodeAutoRefreshUrlState,
    encodeUrlState: urlAutoRefreshRT.encode,
    urlStateKey: AUTOREFRESH_URL_STATE_KEY,
    writeDefaultState: true,
  });

  useInterval(
    () => {
      handleQueryTimeRangeChange({
        start: urlTimeRange.startTime,
        end: urlTimeRange.endTime,
      });
    },
    autoRefresh.isPaused ? null : autoRefresh.interval
  );

  return {
    timeRange: queryTimeRange,
    friendlyTimeRange: urlTimeRange,
    setTimeRange,
    autoRefresh,
    setAutoRefresh,
  };
};

const stringToNumericTimeRange = (timeRange: { start: string; end: string }): TimeRange => ({
  startTime: moment(
    datemath.parse(timeRange.start, {
      momentInstance: moment,
    })
  ).valueOf(),
  endTime: moment(
    datemath.parse(timeRange.end, {
      momentInstance: moment,
      roundUp: true,
    })
  ).valueOf(),
});
