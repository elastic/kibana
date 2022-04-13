/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { ExecutionContextStart } from 'kibana/public';

export interface Context {
  isCloudEnabled: boolean;
  cloudBaseUrl: string;
  executionContext: ExecutionContextStart;
}

export const AppContext = createContext<Context>({} as any);

export const AppContextProvider = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context: Context;
}) => {
  return <AppContext.Provider value={context}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('Cannot use outside of app context');

  return ctx;
};
