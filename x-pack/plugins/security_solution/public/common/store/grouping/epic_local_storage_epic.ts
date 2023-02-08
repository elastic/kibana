/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux';
import { map, filter, ignoreElements, tap, withLatestFrom, delay } from 'rxjs/operators';
import type { Epic } from 'redux-observable';
import { get } from 'lodash/fp';

import {
  updateGroupOptions,
  updateActiveGroup,
  updateGroupItemsPerPage,
  updateGroupActivePage,
  initGrouping,
} from './actions';
import type { TimelineEpicDependencies } from '../../../timelines/store/timeline/types';
import { addGroupsToStorage } from '../../../timelines/containers/local_storage/groups';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

const groupingActionTypes = [
  updateActiveGroup.type,
  updateGroupActivePage.type,
  updateGroupItemsPerPage.type,
  updateGroupOptions.type,
  initGrouping.type,
];

export const createGroupingLocalStorageEpic =
  <State>(): Epic<Action, Action, State, TimelineEpicDependencies<State>> =>
  (action$, state$, { groupByIdSelector, storage }) => {
    const group$ = state$.pipe(map(groupByIdSelector), filter(isNotNull));
    return action$.pipe(
      delay(500),
      withLatestFrom(group$),
      tap(([action, groupById]) => {
        if (groupingActionTypes.includes(action.type)) {
          if (storage) {
            const groupId: string = get('payload.id', action);
            addGroupsToStorage(storage, groupId, groupById[groupId]);
          }
        }
      }),
      ignoreElements()
    );
  };
