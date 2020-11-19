/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext } from 'react';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { AppDeps } from './app';

const AppContext = createContext<AppDeps | null>(null);

export const AppContextProvider = ({
  children,
  appDeps,
}: {
  appDeps: AppDeps | null;
  children: React.ReactNode;
}) => {
  return appDeps ? (
    <KibanaContextProvider services={appDeps}>
      <AppContext.Provider value={appDeps}>{children}</AppContext.Provider>
    </KibanaContextProvider>
  ) : null;
};

export const useAppDependencies = (): AppDeps => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error(
      'The app dependencies Context has not been set. Use the "setAppDependencies()" method when bootstrapping the app.'
    );
  }
  return ctx;
};
