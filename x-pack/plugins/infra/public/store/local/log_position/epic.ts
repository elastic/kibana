/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil } from 'rxjs/operators';

import { pickTimeKey, TimeKey } from '../../../../common/time';
import { createUrlStateEpic } from '../../../utils/url_state';
import {
  jumpToTargetPosition,
  jumpToTargetPositionTime,
  reportVisiblePositions,
  restoreFromUrl,
  startAutoReload,
  stopAutoReload,
} from './actions';

export const createLogPositionEpic = <State>() =>
  combineEpics(createLogAutoReloadEpic<State>(), createLogPositionUrlStateEpic<State>());

export const createLogAutoReloadEpic = <State>(): Epic<Action, Action, State, {}> => action$ =>
  action$.pipe(
    filter(startAutoReload.match),
    exhaustMap(({ payload }) =>
      timer(0, payload).pipe(
        map(() => jumpToTargetPositionTime(Date.now())),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );

interface LogPositionUrlState {
  position?: TimeKey;
}

const createLogPositionUrlStateEpic = <State>() =>
  createUrlStateEpic<LogPositionUrlState, State, {}>('logPosition', isLogPositionUrlState)
    .restoreOnAction(
      restoreFromUrl,
      (urlState, { payload: { defaultPositionTime } }) =>
        urlState && urlState.position
          ? [jumpToTargetPosition(pickTimeKey(urlState.position))]
          : [jumpToTargetPositionTime(defaultPositionTime)]
    )
    .persistOnAction(jumpToTargetPosition, (urlState, state, { payload }) => ({
      ...urlState,
      position: pickTimeKey(payload),
    }))
    .persistOnAction(reportVisiblePositions, (urlState, state, { payload }) => ({
      ...urlState,
      position: payload.middleKey ? pickTimeKey(payload.middleKey) : undefined,
    }));

const isLogPositionUrlState = (value: any): value is LogPositionUrlState =>
  value &&
  value.position &&
  typeof value.position.time === 'number' &&
  typeof value.position.tiebreaker === 'number';
