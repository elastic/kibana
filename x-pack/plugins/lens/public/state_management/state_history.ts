/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, MiddlewareAPI, Action } from '@reduxjs/toolkit';
import { compare } from 'fast-json-patch';
import { get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import {
  beginReversibleOperation,
  completeReversibleOperation,
  recordReversibleStateChange,
} from './lens_slice';
import { StateCoordinator } from './state_coordinator';
import { LensAppState, StateRevision } from './types';
import { initEmpty, redo, undo } from '.';

const reversableStatePaths: Array<keyof LensAppState | string> = [
  'visualization',
  'datasourceStates.formBased.state',
  'datasourceStates.textBased.state',
  'query',
  'filters',
  'savedQuery',
  'activeDatasourceId',
];

const onlyReversiblePaths = (state: LensAppState) => {
  const ret = {};
  reversableStatePaths.forEach((path) => set(ret, path, get(state, path)));
  return ret;
};

const createReversibleStateChange = (prev: LensAppState, next: LensAppState) => {
  const reversiblePrev = onlyReversiblePaths(prev);
  const reversibleNext = onlyReversiblePaths(next);

  const change: StateRevision = {
    active: true,
    created: new Date().getTime(),
    forward: compare(reversiblePrev, reversibleNext),
    backward: compare(reversibleNext, reversiblePrev),
  };

  return change.backward.length || change.forward.length ? change : undefined;
};

let prevStateForExtendedOperation: LensAppState | undefined;

export const stateHistoryMiddleware = () => (store: MiddlewareAPI) => (next: Dispatch) => {
  const completeChange = (prevState: LensAppState) => {
    const nextState = store.getState().lens;

    const change = createReversibleStateChange(prevState, nextState);

    if (change) {
      next(recordReversibleStateChange({ change }));
      StateCoordinator.sendPatch(change.forward);
    }
  };

  return (action: Action) => {
    if (
      [initEmpty, recordReversibleStateChange, undo, redo].some((testAction) =>
        testAction.match(action)
      )
    ) {
      // do nothing
      return next(action);
    }

    if (beginReversibleOperation.match(action)) {
      prevStateForExtendedOperation = store.getState().lens;
      // console.log('BEGIN reversible operation');
    }

    if (prevStateForExtendedOperation) {
      next(action);

      if (completeReversibleOperation.match(action)) {
        completeChange(prevStateForExtendedOperation);
        prevStateForExtendedOperation = undefined;
        // console.log('COMPLETE reversible operation');
      }
    }

    if (!prevStateForExtendedOperation) {
      // default behavior if an extended operation isn't in progress
      const prevState = store.getState().lens;

      next(action);

      completeChange(prevState);
    }
  };
};
