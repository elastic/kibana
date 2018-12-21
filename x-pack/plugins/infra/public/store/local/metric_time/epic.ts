/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';

import { setRangeTime, startMetricsAutoReload, stopMetricsAutoReload } from './actions';

interface MetricTimeEpicDependencies<State> {
  selectMetricTimeUpdatePolicyInterval: (state: State) => number | null;
  selectMetricRangeFromTimeRange: (state: State) => number | null;
}

export const createMetricTimeEpic = <State>(): Epic<
  Action,
  Action,
  State,
  MetricTimeEpicDependencies<State>
> => (
  action$,
  state$,
  { selectMetricTimeUpdatePolicyInterval, selectMetricRangeFromTimeRange }
) => {
  const updateInterval$ = state$.pipe(
    map(selectMetricTimeUpdatePolicyInterval),
    filter(isNotNull)
  );

  const range$ = state$.pipe(
    map(selectMetricRangeFromTimeRange),
    filter(isNotNull)
  );

  return action$.pipe(
    filter(startMetricsAutoReload.match),
    withLatestFrom(updateInterval$, range$),
    exhaustMap(([action, updateInterval, range]) =>
      timer(0, updateInterval).pipe(
        map(() =>
          setRangeTime({
            from: moment()
              .subtract(range, 'ms')
              .valueOf(),
            to: moment().valueOf(),
            interval: '1m',
          })
        ),
        takeUntil(action$.pipe(filter(stopMetricsAutoReload.match)))
      )
    )
  );
};

const isNotNull = <T>(value: T | null): value is T => value !== null;
