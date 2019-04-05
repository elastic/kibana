/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, unionBy } from 'lodash/fp';
import moment from 'moment';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setAbsoluteRangeDatePicker,
  setDuration,
  setQuery,
  setRelativeRangeDatePicker,
  startAutoReload,
  stopAutoReload,
} from './actions';
import { InputsModel } from './model';

export type InputsState = InputsModel;

export const initialInputsState: InputsState = {
  global: {
    timerange: {
      kind: 'absolute',
      from: moment()
        .subtract(1, 'day') // subtracts 24 hours from 'now'
        .valueOf(),
      to: Date.now(),
    },
    query: [],
    policy: {
      kind: 'manual',
      duration: 5000,
    },
  },
};

export const inputsReducer = reducerWithInitialState(initialInputsState)
  .case(setAbsoluteRangeDatePicker, (state, { id, from, to }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      timerange: {
        kind: 'absolute',
        from,
        to,
      },
    },
  }))
  .case(setRelativeRangeDatePicker, (state, { id, option, from, to }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      timerange: {
        kind: 'relative',
        option,
        from,
        to,
      },
    },
  }))
  .case(setQuery, (state, { id, loading, refetch }) => ({
    ...state,
    global: {
      ...state.global,
      query: unionBy('id', [{ id, loading, refetch }], state.global.query),
    },
  }))
  .case(setDuration, (state, { id, duration }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        duration,
      },
    },
  }))
  .case(startAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        kind: 'interval',
      },
    },
  }))
  .case(stopAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        kind: 'manual',
      },
    },
  }))
  .build();
