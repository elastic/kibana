/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { AppState } from '../../types';

const StateContext = createContext<AppState>({});

export const initialState = {};

export const reducer = (state: any, action: { type: string }) => {
  switch (action.type) {
    default:
      return state;
  }
};

export const AppStateProvider = StateContext.Provider;

export const useAppState = () => useContext<AppState>(StateContext);
