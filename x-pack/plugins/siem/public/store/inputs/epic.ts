/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { get } from 'lodash/fp';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';

import { setRelativeRangeDatePicker, startAutoReload, stopAutoReload } from './actions';
import { Policy, TimeRange } from './model';

interface GlobalTimeEpicDependencies<State> {
  selectGlobalPolicy: (state: State) => Policy;
  selectGlobalTimeRange: (state: State) => TimeRange;
}

export const createGlobalTimeEpic = <State>(): Epic<
  Action,
  Action,
  State,
  GlobalTimeEpicDependencies<State>
> => (action$, state$, { selectGlobalPolicy, selectGlobalTimeRange }) => {
  const policy$ = state$.pipe(
    map(selectGlobalPolicy),
    filter(isNotNull)
  );

  const timerange$ = state$.pipe(
    map(selectGlobalTimeRange),
    filter(isNotNull)
  );

  return action$.pipe(
    filter(startAutoReload.match),
    withLatestFrom(policy$, timerange$),
    filter(
      ([action, policy, timerange]) =>
        timerange.kind === 'relative' && timerange.toStr != null && timerange.toStr === 'now'
    ),
    exhaustMap(([action, policy, timerange]) =>
      timer(0, policy.duration).pipe(
        map(() => {
          const fromStr = get('fromStr', timerange);
          const momentDate = fromStr != null ? dateMath.parse(fromStr) : null;
          return setRelativeRangeDatePicker({
            id: 'global',
            fromStr: fromStr != null ? fromStr : '',
            toStr: 'now',
            to: Date.now(),
            from: momentDate != null && momentDate.isValid() ? momentDate.valueOf() : 0,
          });
        }),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );
};

const isNotNull = <T>(value: T | null): value is T => value !== null;
