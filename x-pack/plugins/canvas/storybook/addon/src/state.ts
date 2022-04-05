/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, Dispatch, Store } from 'redux';
import thunkMiddleware from 'redux-thunk';
import addons from '@storybook/addons';
import { diff } from 'jsondiffpatch';
import { isFunction } from 'lodash';

import { EVENTS } from './constants';

// @ts-expect-error untyped local
import { resolvedArgs } from '../../../public/state/middleware/resolved_args';

// @ts-expect-error untyped local
import { getRootReducer } from '../../../public/state/reducers';

// @ts-expect-error Untyped local
import { getDefaultWorkpad } from '../../../public/state/defaults';
// @ts-expect-error Untyped local
import { getInitialState as getState } from '../../../public/state/initial_state';
import { State } from '../../../types';

export const getInitialState: () => State = () => getState();
export const getMiddleware = () => applyMiddleware(thunkMiddleware);
export const getReducer = () => getRootReducer(getInitialState());

export const patchDispatch: (store: Store, dispatch: Dispatch) => Dispatch =
  (store, dispatch) => (action) => {
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
