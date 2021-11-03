/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { AppState } from '../../state';

export const MountWithReduxProvider: React.FC<{ state?: AppState }> = ({ children, state }) => (
  <ReduxProvider
    store={{
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue(state || { selectedFilters: null }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    }}
  >
    {children}
  </ReduxProvider>
);
