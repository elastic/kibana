/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, useReducer } from 'react';
import { AppCore, AppPlugins } from '../../shim';

export interface AppStateInterface {
  core: AppCore;
  plugins: AppPlugins;
}

export const AppState = createContext({});

export const StateProvider = ({
  reducer,
  initialState,
  children,
}: {
  reducer: (state: object, action: any) => object;
  initialState: object;
  children: any;
}) => <AppState.Provider value={useReducer(reducer, initialState)}>{children}</AppState.Provider>;

export const useStateValue = () => useContext(AppState);
