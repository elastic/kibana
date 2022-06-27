/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { registerUrlParam, updateUrlParam, deregisterUrlParam } from './actions';

export type GlobalUrlParam = Record<string, string | null>;

export const initialGlobalUrlParam: GlobalUrlParam = {};

export const globalUrlParamReducer = reducerWithInitialState(initialGlobalUrlParam)
  .case(registerUrlParam, (state, { key, initialValue }) => {
    // It doesn't allow the query param to be used twice
    if (state[key] !== undefined) {
      // eslint-disable-next-line no-console
      console.error(`Url param key '${key}' is already being used.`);
      return state;
    }

    return {
      ...state,
      [key]: initialValue,
    };
  })
  .case(deregisterUrlParam, (state, { key }) => {
    const nextState = { ...state };

    delete nextState[key];

    return nextState;
  })
  .case(updateUrlParam, (state, { key, value }) => {
    // Only update the URL after the query param is registered and if the current value is different than the previous value
    if (state[key] === undefined || state[key] === value) {
      return state;
    }

    return {
      ...state,
      [key]: value,
    };
  })
  .build();
