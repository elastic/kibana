/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { combineEpics, Epic, EpicWithState } from 'redux-observable';
import { of } from 'rxjs';

import { loadSource } from './actions';
import { loadSourceEpic } from './operations/load';

export const createSourceEpic = <State>() =>
  combineEpics(createSourceEffectsEpic<State>(), loadSourceEpic as EpicWithState<
    typeof loadSourceEpic,
    State
  >);

export const createSourceEffectsEpic = <State>(): Epic<Action, Action, State, {}> => action$ => {
  return of(loadSource({ sourceId: 'default' }));
};
