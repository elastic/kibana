/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createContext, useContext } from 'react';
import { AppCore, AppPlugins } from '../../shim';

export interface AppStateInterface {
  core: AppCore;
  plugins: AppPlugins;
}

const AppState = createContext({});

export const AppStateProvider = AppState.Provider;

export const useAppState = () => useContext(AppState);
