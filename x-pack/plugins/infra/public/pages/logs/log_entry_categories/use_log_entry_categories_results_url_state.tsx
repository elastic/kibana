/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

import { useUrlState } from '../../../utils/use_url_state';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const autoRefreshRT = rt.union([
  rt.type({
    interval: rt.number,
    isPaused: rt.boolean,
  }),
  rt.undefined,
]);

export const stringTimeRangeRT = rt.type({
  startTime: rt.string,
  endTime: rt.string,
});
export type StringTimeRange = rt.TypeOf<typeof stringTimeRangeRT>;

const urlTimeRangeRT = rt.union([stringTimeRangeRT, rt.undefined]);

const TIME_RANGE_URL_STATE_KEY = 'timeRange';
const AUTOREFRESH_URL_STATE_KEY = 'autoRefresh';

export const useLogEntryCategoriesResultsUrlState = () => {
  const { services } = useKibanaContextForPlugin();
  const { from: sharedFrom, to: sharedTo } = services.data.query.timefilter.timefilter.getTime();

  const [timeRange, setTimeRange] = useUrlState({
    defaultState: {
      startTime: sharedFrom || 'now-2w',
      endTime: sharedTo || 'now',
    },
    decodeUrlState: (value: unknown) =>
      pipe(urlTimeRangeRT.decode(value), fold(constant(undefined), identity)),
    encodeUrlState: urlTimeRangeRT.encode,
    urlStateKey: TIME_RANGE_URL_STATE_KEY,
    writeDefaultState: true,
  });

  useEffect(() => {
    // Share timestamp changes with the rest of Kibana
    const { startTime, endTime } = timeRange;
    services.data.query.timefilter.timefilter.setTime({
      from: startTime,
      to: endTime,
    });
  }, [timeRange, services.data.query.timefilter.timefilter]);

  const [autoRefresh, setAutoRefresh] = useUrlState({
    defaultState: {
      isPaused: false,
      interval: 60000,
    },
    decodeUrlState: (value: unknown) =>
      pipe(autoRefreshRT.decode(value), fold(constant(undefined), identity)),
    encodeUrlState: autoRefreshRT.encode,
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
