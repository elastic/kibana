/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { createContext, useContext, useRef, useCallback } from 'react';

import type { IntegrationsAppBrowseRouteState } from '../../../types';
import { useIntraAppState } from '../../../hooks';

interface IntegrationsStateContextValue {
  getFromIntegrations(): string | undefined;
}

const IntegrationsStateContext = createContext<IntegrationsStateContextValue>({
  getFromIntegrations: () => undefined,
});

export const IntegrationsStateContextProvider: FunctionComponent = ({ children }) => {
  const maybeState = useIntraAppState<undefined | IntegrationsAppBrowseRouteState>();
  const fromIntegrationsRef = useRef<undefined | string>(maybeState?.fromIntegrations);

  const getFromIntegrations = useCallback(() => {
    return fromIntegrationsRef.current;
  }, []);
  return (
    <IntegrationsStateContext.Provider value={{ getFromIntegrations }}>
      {children}
    </IntegrationsStateContext.Provider>
  );
};

export const useIntegrationsStateContext = () => {
  const ctx = useContext(IntegrationsStateContext);
  if (!ctx) {
    throw new Error(
      'useIntegrationsStateContext can only be used inside of IntegrationsStateContextProvider'
    );
  }
  return ctx;
};
