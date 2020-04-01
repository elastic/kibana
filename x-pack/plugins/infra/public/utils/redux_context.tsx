/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSelector } from 'react-redux';
import React, { createContext } from 'react';
import { State, initialState } from '../store';

export const ReduxStateContext = createContext(initialState);

export const ReduxStateContextProvider = ({ children }: { children: JSX.Element }) => {
  const state = useSelector((store: State) => store);
  return <ReduxStateContext.Provider value={state}>{children}</ReduxStateContext.Provider>;
};
