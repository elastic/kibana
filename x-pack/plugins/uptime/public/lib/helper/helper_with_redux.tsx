/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';

export const MountWithReduxProvider: React.FC = ({ children }) => (
  <ReduxProvider
    store={{
      dispatch: jest.fn(),
      getState: jest.fn().mockReturnValue({ selectedFilters: null }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
    }}
  >
    {children}
  </ReduxProvider>
);
