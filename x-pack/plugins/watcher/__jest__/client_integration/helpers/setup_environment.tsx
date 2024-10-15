/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HttpSetup } from 'src/core/public';

import { init as initHttpRequests } from './http_requests';
import { mockContextValue } from './app_context.mock';
import { AppContextProvider } from '../../../public/application/app_context';
import { setHttpClient, setSavedObjectsClient } from '../../../public/application/lib/api';

const mockSavedObjectsClient = () => {
  return {
    find: (_params?: any) => ({
      savedObjects: [],
    }),
  };
};

export const WithAppDependencies =
  (Component: any, httpSetup: HttpSetup) => (props: Record<string, unknown>) => {
    setHttpClient(httpSetup);

    return (
      <AppContextProvider value={mockContextValue}>
        <Component {...props} />
      </AppContextProvider>
    );
  };

export const setupEnvironment = () => {
  setSavedObjectsClient(mockSavedObjectsClient() as any);

  return initHttpRequests();
};
