/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { registerUrlParam, updateUrlParam } from './actions';

export type GlobalUrlState = Record<string, string | null>;

export const initialGlobalUrlState: GlobalUrlState = {};

export const globalUrlStateReducer = reducerWithInitialState(initialGlobalUrlState)
  .case(registerUrlParam, (state, { key, initialValue }) => {
    if (state[key] !== undefined) {
      throw new Error(`Query string '${key}' is already being used.`);
    }

    return {
      ...state,
      [key]: initialValue,
    };
  })
  .case(updateUrlParam, (state, { key, value }) => {
    if (state[key] === undefined || state[key] === value) {
      return state;
    }

    return {
      ...state,
      [key]: value,
    };
  })
  .build();
