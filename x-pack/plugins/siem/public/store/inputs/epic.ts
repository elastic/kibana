/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';

import { setRelativeRangeDatePicker, startAutoReload, stopAutoReload } from './actions';
import { InputsModel } from './model';

interface GlobalTimeEpicDependencies<State> {
  selectInputs: (state: State) => InputsModel;
}

export const createGlobalTimeEpic = <State>(): Epic<
  Action,
  Action,
  State,
  GlobalTimeEpicDependencies<State>
> => (action$, state$, { selectInputs }) => {
  const inputs$ = state$.pipe(
    map(selectInputs),
    filter(isNotNull)
  );

  return action$.pipe(
    filter(startAutoReload.match),
    withLatestFrom(inputs$),
    filter(([action, inputs]) => {
      const input = inputs[action.payload.id];
      return (
        input.timerange.kind === 'relative' &&
        input.timerange.toStr != null &&
        input.timerange.toStr === 'now'
      );
    }),
    exhaustMap(([action, inputs]) =>
      timer(0, inputs[action.payload.id].policy.duration).pipe(
        map(() => {
          const input = inputs[action.payload.id];
          const momentDate =
            input.timerange.fromStr != null ? dateMath.parse(input.timerange.fromStr) : null;
          return setRelativeRangeDatePicker({
            id: action.payload.id,
            fromStr: input.timerange.fromStr != null ? input.timerange.fromStr : '',
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
