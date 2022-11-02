/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { useUrlState } from '../../../../utils/use_url_state';
import {
  useKibanaTimefilterTime,
  useSyncKibanaTimeFilterTime,
} from '../../../../hooks/use_kibana_timefilter_time';

export const StringTimeRangeRT = rt.type({
  startTime: rt.string,
  endTime: rt.string,
});
export type StringTimeRange = rt.TypeOf<typeof StringTimeRangeRT>;

const UrlTimeRangeRT = rt.union([StringTimeRangeRT, rt.undefined]);

const TIME_RANGE_URL_STATE_KEY = 'timeRange';
const TIME_DEFAULTS = { from: 'now-15m', to: 'now' };

export const useTimeRangeUrlState = () => {
  const [getTime, setTime] = useKibanaTimefilterTime(TIME_DEFAULTS);
  const { from: start, to: end } = getTime();

  const [timeRange, setTimeRange] = useUrlState({
    defaultState: {
      startTime: start,
      endTime: end,
    },
    decodeUrlState: (value: unknown) =>
      pipe(UrlTimeRangeRT.decode(value), fold(constant(undefined), identity)),
    encodeUrlState: UrlTimeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
    writeDefaultState: true,
  });

  useSyncKibanaTimeFilterTime(TIME_DEFAULTS, { from: timeRange.startTime, to: timeRange.endTime });

  return {
    getTime,
    setTime,
    timeRange,
    setTimeRange,
  };
};
