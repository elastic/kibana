/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { recentlyAccessed } from 'ui/persisted_log';
import { handleActions } from 'redux-actions';
import { setWorkpad, sizeWorkpad, setColors, setName, setWriteable } from '../actions/workpad';
import { APP_ROUTE_WORKPAD } from '../../../common/lib/constants';

export const workpadReducer = handleActions(
  {
    [setWorkpad]: (workpadState, { payload }) => {
      recentlyAccessed.add(`${APP_ROUTE_WORKPAD}/${payload.id}`, payload.name, payload.id);
      return payload;
    },

    [sizeWorkpad]: (workpadState, { payload }) => {
      return { ...workpadState, ...payload };
    },

    [setColors]: (workpadState, { payload }) => {
      return { ...workpadState, colors: payload };
    },

    [setName]: (workpadState, { payload }) => {
      recentlyAccessed.add(`${APP_ROUTE_WORKPAD}/${workpadState.id}`, payload, workpadState.id);
      return { ...workpadState, name: payload };
    },

    [setWriteable]: (workpadState, { payload }) => {
      return { ...workpadState, isWriteable: Boolean(payload) };
    },
  },
  {}
);
