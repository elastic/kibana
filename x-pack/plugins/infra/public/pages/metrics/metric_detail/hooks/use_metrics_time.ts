/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useCallback, useEffect } from 'react';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../utils/use_url_state';
import { replaceStateKeyInQueryString } from '../../../../utils/url_state';

const parseRange = (range: MetricsTimeInput) => {
  const parsedFrom = dateMath.parse(range.from.toString());
  const parsedTo = dateMath.parse(range.to.toString(), { roundUp: true });
  return {
    ...range,
    from: (parsedFrom && parsedFrom.valueOf()) || moment().subtract(1, 'hour').valueOf(),
    to: (parsedTo && parsedTo.valueOf()) || moment().valueOf(),
  };
};

const DEFAULT_TIMERANGE: MetricsTimeInput = {
  from: 'now-1h',
  to: 'now',
  interval: '>=1m',
};

const DEFAULT_URL_STATE: MetricsTimeUrlState = {
  time: DEFAULT_TIMERANGE,
  autoReload: false,
  refreshInterval: 5000,
};

export const useMetricsTime = () => {
  const [urlState, setUrlState] = useUrlState<MetricsTimeUrlState>({
    defaultState: DEFAULT_URL_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'metricTime',
  });

  const [isAutoReloading, setAutoReload] = useState(urlState.autoReload || false);
  const [refreshInterval, setRefreshInterval] = useState(urlState.refreshInterval || 5000);
  const [lastRefresh, setLastRefresh] = useState<number>(moment().valueOf());
  const [timeRange, setTimeRange] = useState(urlState.time || DEFAULT_TIMERANGE);

  useEffect(() => {
    const newState = {
      time: timeRange,
      autoReload: isAutoReloading,
      refreshInterval,
    };
    return setUrlState(newState);
  }, [isAutoReloading, refreshInterval, setUrlState, timeRange]);

  const [parsedTimeRange, setParsedTimeRange] = useState(
    parseRange(urlState.time || DEFAULT_TIMERANGE)
  );

  const updateTimeRange = useCallback((range: MetricsTimeInput) => {
    setTimeRange(range);
    setParsedTimeRange(parseRange(range));
  }, []);

  return {
    timeRange,
    setTimeRange: updateTimeRange,
    parsedTimeRange,
    refreshInterval,
    setRefreshInterval,
    isAutoReloading,
    setAutoReload,
    lastRefresh,
    triggerRefresh: useCallback(() => {
      return setLastRefresh(moment().valueOf());
    }, [setLastRefresh]),
  };
};

export const MetricsTimeInputRT = rt.type({
  from: rt.union([rt.string, rt.number]),
  to: rt.union([rt.string, rt.number]),
  interval: rt.string,
});
export type MetricsTimeInput = rt.TypeOf<typeof MetricsTimeInputRT>;

export const MetricsTimeUrlStateRT = rt.partial({
  time: MetricsTimeInputRT,
  autoReload: rt.boolean,
  refreshInterval: rt.number,
});
export type MetricsTimeUrlState = rt.TypeOf<typeof MetricsTimeUrlStateRT>;

const encodeUrlState = MetricsTimeUrlStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(MetricsTimeUrlStateRT.decode(value), fold(constant(undefined), identity));

export const replaceMetricTimeInQueryString = (from: number, to: number) =>
  Number.isNaN(from) || Number.isNaN(to)
    ? (value: string) => value
    : replaceStateKeyInQueryString<MetricsTimeUrlState>('metricTime', {
        autoReload: false,
        time: {
          interval: '>=1m',
          from: moment(from).toISOString(),
          to: moment(to).toISOString(),
        },
      });

export const MetricsTimeContainer = createContainer(useMetricsTime);
export const [MetricsTimeProvider, useMetricsTimeContext] = MetricsTimeContainer;
