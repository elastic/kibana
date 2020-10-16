/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface HealthContextValue {
  loadingHealthCheck: boolean;
  setLoadingHealthCheck: (loading: boolean) => void;
}

const defaultHealthContext: HealthContextValue = {
  loadingHealthCheck: false,
  setLoadingHealthCheck: (loading: boolean) => {
    throw new Error(
      'setLoadingHealthCheck was not initialized, set it when you invoke the context'
    );
  },
};

const HealthContext = createContext<HealthContextValue>(defaultHealthContext);

export const HealthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const setLoadingHealthCheck = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const value = useMemo(() => {
    return { loadingHealthCheck: loading, setLoadingHealthCheck };
  }, [loading, setLoadingHealthCheck]);

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
};

export const useHealthContext = () => {
  const ctx = useContext(HealthContext);
  if (!ctx) {
    throw new Error('HealthContext has not been set.');
  }
  return ctx;
};
