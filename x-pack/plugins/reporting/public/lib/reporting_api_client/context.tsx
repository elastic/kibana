/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from 'src/core/public';
import type { FunctionComponent } from 'react';
import React, { createContext, useContext } from 'react';

import type { ReportingAPIClient } from './reporting_api_client';

interface ContextValue {
  http: HttpSetup;
  apiClient: ReportingAPIClient;
}

const InternalApiClientContext = createContext<undefined | ContextValue>(undefined);

export const InternalApiClientClientProvider: FunctionComponent<{
  http: HttpSetup;
  apiClient: ReportingAPIClient;
}> = ({ http, apiClient, children }) => {
  return (
    <InternalApiClientContext.Provider value={{ http, apiClient }}>
      {children}
    </InternalApiClientContext.Provider>
  );
};

export const useInternalApiClient = (): ContextValue => {
  const ctx = useContext(InternalApiClientContext);
  if (!ctx) {
    throw new Error('"useInternalApiClient" can only be used inside of "InternalApiClientContext"');
  }
  return ctx;
};
