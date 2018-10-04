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

import { setRangeTime, startAutoReload, stopAutoReload } from './actions';

interface MetricTimeEpicDependencies<State> {
  selectMetricTimeUpdatePolicyInterval: (state: State) => number | null;
}

export const createMetricTimeEpic = <State>(): Epic<
  Action,
  Action,
  State,
  MetricTimeEpicDependencies<State>
> => (action$, state$, { selectMetricTimeUpdatePolicyInterval }) => {
  const updateInterval$ = state$.pipe(
    map(selectMetricTimeUpdatePolicyInterval),
    filter(isNotNull)
  );

  return action$.pipe(
    filter(startAutoReload.match),
    withLatestFrom(updateInterval$),
    exhaustMap(([action, updateInterval]) =>
      timer(0, updateInterval).pipe(
        map(() =>
          setRangeTime({
            to: moment()
              .subtract(1, 'hour')
              .millisecond(),
            from: moment().millisecond(),
          })
        ),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );
};

const isNotNull = <T>(value: T | null): value is T => value !== null;
