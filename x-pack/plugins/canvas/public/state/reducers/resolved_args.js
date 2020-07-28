/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { prepend } from '../../lib/modify_path';
import * as actions from '../actions/resolved_args';
import { flushContext, flushContextAfterIndex } from '../actions/elements';
import { setWorkpad } from '../actions/workpad';

const { set, del } = immutable;
/*
  Resolved args are a way to handle async values. They track the status, value, and error
  state thgouh the lifecycle of the request, and are an object that looks like this:

  {
    status: 'pending',
    value: null,
    error: null,
  }

  Here, the request is in flight, and the application is waiting for a value. Valid statuses
  are `initializing`, `pending`, `ready`, and `error`.

  When status is `ready`, the value will be whatever came back in the response.

  When status is `error`, the value will not change, and the error property will be the error.
*/

function _getState(hasError, loading) {
  if (hasError) {
    return 'error';
  }
  if (Boolean(loading)) {
    return 'pending';
  }
  return 'ready';
}

function _getValue(hasError, value, oldVal) {
  if (hasError || value == null) {
    return oldVal && oldVal.value;
  }
  return value;
}

function getContext(value, loading = false, oldVal = null) {
  // TODO: this is no longer correct.
  const hasError = value instanceof Error;
  return {
    state: _getState(hasError, loading),
    value: _getValue(hasError, value, oldVal),
    error: hasError ? value : null,
  };
}

function getFullPath(path) {
  const isArray = Array.isArray(path);
  const isString = typeof path === 'string';
  if (!isArray && !isString) {
    throw new Error(`Resolved argument path is invalid: ${path}`);
  }
  return prepend(path, 'resolvedArgs');
}

export const resolvedArgsReducer = handleActions(
  {
    [actions.setLoading]: (transientState, { payload }) => {
      const { path, loading = true } = payload;
      const fullPath = getFullPath(path);
      const oldVal = get(transientState, fullPath, null);
      return set(transientState, fullPath, getContext(get(oldVal, 'value', null), loading));
    },

    [actions.setValue]: (transientState, { payload }) => {
      const { path, value } = payload;
      const fullPath = getFullPath(path);
      const oldVal = get(transientState, fullPath, null);
      return set(transientState, fullPath, getContext(value, false, oldVal));
    },

    [actions.setValues]: (transientState, { payload }) => {
      return payload.reduce((acc, setValueObj) => {
        const fullPath = getFullPath(setValueObj.path);
        const oldVal = get(acc, fullPath, null);
        return set(acc, fullPath, getContext(setValueObj.value, false, oldVal));
      }, transientState);
    },

    [actions.clearValue]: (transientState, { payload }) => {
      const { path } = payload;
      return del(transientState, getFullPath(path));
    },

    [actions.clearValues]: (transientState, { payload }) => {
      return payload.reduce((transientState, path) => {
        return del(transientState, getFullPath(path));
      }, transientState);
    },

    [actions.inFlightActive]: (transientState) => {
      return set(transientState, 'inFlight', true);
    },

    [actions.inFlightComplete]: (transientState) => {
      return set(transientState, 'inFlight', false);
    },

    /*
     * Flush all cached contexts
     */
    [flushContext]: (transientState, { payload: elementId }) => {
      return del(transientState, getFullPath([elementId, 'expressionContext']));
    },

    /*
     * Flush cached context indices from the given index to the last
     */
    [flushContextAfterIndex]: (transientState, { payload }) => {
      const { elementId, index } = payload;
      const expressionContext = get(transientState, getFullPath([elementId, 'expressionContext']));

      // if there is not existing context, there's nothing to do here
      if (!expressionContext) {
        return transientState;
      }

      return Object.keys(expressionContext).reduce((state, indexKey) => {
        const indexAsNum = parseInt(indexKey, 10);
        if (indexAsNum >= index) {
          return del(state, getFullPath([elementId, 'expressionContext', indexKey]));
        }

        return state;
      }, transientState);
    },
    [setWorkpad]: (transientState, {}) => {
      return set(transientState, 'resolvedArgs', {});
    },
  },
  {}
);
