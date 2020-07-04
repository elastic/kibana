/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* es-lint-disable import/no-extraneous-dependencies */
import { applyMiddleware, Dispatch, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import addons from '@storybook/addons';
import { diff } from 'jsondiffpatch';
import { isFunction } from 'lodash';

import { EVENTS } from './constants';

// @ts-expect-error untyped local
import { appReady } from '../../../public/state/middleware/app_ready';
// @ts-expect-error untyped local
import { resolvedArgs } from '../../../public/state/middleware/resolved_args';

// @ts-expect-error untyped local
import { getRootReducer } from '../../../public/state/reducers';

// @ts-expect-error Untyped local
import { getDefaultWorkpad } from '../../../public/state/defaults';
import { State } from '../../../types';

export const initialState: State = {
  app: {
    basePath: '/',
    ready: true,
    serverFunctions: [],
  },
  assets: {},
  transient: {
    canUserWrite: true,
    zoomScale: 1,
    elementStats: {
      total: 0,
      ready: 0,
      pending: 0,
      error: 0,
    },
    inFlight: false,
    fullScreen: false,
    selectedTopLevelNodes: [],
    resolvedArgs: {},
    refresh: {
      interval: 0,
    },
    autoplay: {
      enabled: false,
      interval: 10000,
    },
  },
  persistent: {
    schemaVersion: 2,
    workpad: getDefaultWorkpad(),
  },
};

export const middleware = applyMiddleware(thunkMiddleware);
export const reducer = getRootReducer(initialState);

export const patchDispatch: (store: Store, dispatch: Dispatch) => Dispatch = (store, dispatch) => (
  action
) => {
  const channel = addons.getChannel();

  const previousState = store.getState();
  const returnValue = dispatch(action);
  const newState = store.getState();
  const change = diff(previousState, newState) || {};

  channel.emit(EVENTS.ACTION, {
    previousState,
    newState,
    change,
    action: isFunction(action) ? { type: '(thunk)' } : action,
  });

  return returnValue;
};
