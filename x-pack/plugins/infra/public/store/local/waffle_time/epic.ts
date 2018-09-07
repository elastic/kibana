/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';

import { createUrlStateEpic } from '../../../utils/url_state';
import { jumpToTime, restoreFromUrl, startAutoReload, stopAutoReload } from './actions';

export const createWaffleTimeEpic = <State>() =>
  combineEpics(createWaffleAutoReloadEpic<State>(), createWaffleTimeUrlStateEpic<State>());

interface WaffleTimeEpicDependencies<State> {
  selectWaffleTimeUpdatePolicyInterval: (state: State) => number | null;
}

export const createWaffleAutoReloadEpic = <State>(): Epic<
  Action,
  Action,
  State,
  WaffleTimeEpicDependencies<State>
> => (action$, state$, { selectWaffleTimeUpdatePolicyInterval }) => {
  const updateInterval$ = state$.pipe(
    map(selectWaffleTimeUpdatePolicyInterval),
    filter(isNotNull)
  );

  return action$.pipe(
    filter(startAutoReload.match),
    withLatestFrom(updateInterval$),
    exhaustMap(([action, updateInterval]) =>
      timer(0, updateInterval).pipe(
        map(() => jumpToTime(Date.now())),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );
};

interface WaffleTimeUrlState {
  time?: number;
}

const createWaffleTimeUrlStateEpic = <State>() =>
  createUrlStateEpic<WaffleTimeUrlState, State, {}>('waffleTime', isWaffleTimeUrlState)
    .restoreOnAction(
      restoreFromUrl,
      (urlState, { payload: { defaultTime } }) =>
        urlState && urlState.time ? [jumpToTime(urlState.time)] : [jumpToTime(defaultTime)]
    )
    .restoreOnChange(({ time }) => time, time => (time ? [jumpToTime(time)] : []))
    .persistOnAction(jumpToTime, (urlState, state, { payload }) => ({
      ...urlState,
      time: payload,
    }));

const isWaffleTimeUrlState = (value: any): value is WaffleTimeUrlState =>
  value && (!('time' in value) || typeof value.time === 'number');

const isNotNull = <T>(value: T | null): value is T => value !== null;
