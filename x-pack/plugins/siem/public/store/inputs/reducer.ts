/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { get, unionBy } from 'lodash/fp';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  deleteAllQuery,
  setAbsoluteRangeDatePicker,
  setDuration,
  setQuery,
  setRelativeRangeDatePicker,
  startAutoReload,
  stopAutoReload,
  toggleTimelineLinkTo,
} from './actions';
import { toggleLockTimeline, updateInputTimerange } from './helpers';
import { InputsModel, TimeRange } from './model';

export type InputsState = InputsModel;
const momentDate = dateMath.parse('now-24h');
export const initialInputsState: InputsState = {
  global: {
    timerange: {
      kind: 'relative',
      fromStr: 'now-24h',
      toStr: 'now',
      from: momentDate ? momentDate.valueOf() : 0,
      to: Date.now(),
    },
    query: [],
    policy: {
      kind: 'manual',
      duration: 300000,
    },
    linkTo: ['timeline'],
  },
  timeline: {
    timerange: {
      kind: 'relative',
      fromStr: 'now-24h',
      toStr: 'now',
      from: momentDate ? momentDate.valueOf() : 0,
      to: Date.now(),
    },
    query: [],
    policy: {
      kind: 'manual',
      duration: 300000,
    },
    linkTo: ['global'],
  },
};

export const inputsReducer = reducerWithInitialState(initialInputsState)
  .case(setAbsoluteRangeDatePicker, (state, { id, from, to }) => {
    const timerange: TimeRange = {
      kind: 'absolute',
      fromStr: undefined,
      toStr: undefined,
      from,
      to,
    };
    return updateInputTimerange(id, timerange, state);
  })
  .case(setRelativeRangeDatePicker, (state, { id, fromStr, from, to, toStr }) => {
    const timerange: TimeRange = {
      kind: 'relative',
      fromStr,
      toStr,
      from,
      to,
    };
    return updateInputTimerange(id, timerange, state);
  })
  .case(deleteAllQuery, (state, { id }) => ({
    ...state,
    [id]: {
      ...get(id, state),
      query: state.global.query.slice(state.global.query.length),
    },
  }))
  .case(setQuery, (state, { inputId, id, loading, refetch }) => ({
    ...state,
    [inputId]: {
      ...get(inputId, state),
      query: unionBy('id', [{ id, loading, refetch }], state[inputId].query),
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
  .case(toggleTimelineLinkTo, (state, { linkToId }) => toggleLockTimeline(linkToId, state))
  .build();
