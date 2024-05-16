/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { type ReactReduxContextValue } from 'react-redux';
import { initialState } from './reducer';

import { store, type RootState } from './store';

export const Context = createContext<ReactReduxContextValue<RootState>>({
  store,
  storeState: initialState,
});
