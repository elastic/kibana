/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import moment from 'moment';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { setInterval, setRangeDatePicker, startAutoReload, stopAutoReload } from './actions';
import { InputsModel } from './model';

export type InputsState = InputsModel;

export const initialInputsState: InputsState = {
  kql: {
    timerange: {
      type: 'relative',
      from: moment()
        .subtract(1, 'hour')
        .valueOf(),
      to: moment().valueOf(),
    },
    policy: {
      type: 'manual',
      interval: 5,
      intervalType: 'minutes',
    },
  },
};

export const inputsReducer = reducerWithInitialState(initialInputsState)
  .case(setRangeDatePicker, (state, { id, from, to }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      timerange: {
        from,
        to,
      },
    },
  }))
  .case(setInterval, (state, { id, interval, intervalType }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        interval,
        intervalType,
      },
    },
  }))
  .case(startAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      policy: {
        ...get(`${id}.policy`, state),
        type: 'interval',
      },
    },
  }))
  .case(stopAutoReload, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      olicy: {
        ...get(`${id}.policy`, state),
        type: 'manual',
      },
    },
  }))
  .build();
