/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil } from 'rxjs/operators';

import { jumpToTargetPositionTime, startAutoReload, stopAutoReload } from './actions';

export const createLogPositionEpic = <State>(): Epic<Action, Action, State, {}> => action$ =>
  action$.pipe(
    filter(startAutoReload.match),
    exhaustMap(({ payload }) =>
      timer(0, payload).pipe(
        map(() => jumpToTargetPositionTime(Date.now())),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );
