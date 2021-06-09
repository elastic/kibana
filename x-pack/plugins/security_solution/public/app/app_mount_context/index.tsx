/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters } from 'kibana/public';
import React, { createContext, useContext } from 'react';

/* eslint-disable react/display-name */

/**
 * We use context to provide these values to prevent prop drilling as well
 * as pass values such as onAppLeave to the SecurityPageWrapper which is
 * nested within each subApp's Router
 */
interface AppMountContextType {
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

const AppMountContext = createContext<AppMountContextType | null>(null);

interface AppMountProviderProps {
  appMountParams: AppMountContextType;
}

export const AppMountProvider: React.FC<AppMountProviderProps> = React.memo(
  ({ appMountParams, children }) => {
    return <AppMountContext.Provider value={appMountParams}>{children}</AppMountContext.Provider>;
  }
);

export const useAppMountContext = (): AppMountContextType => {
  const appMountContext = useContext(AppMountContext);

  if (appMountContext === null) {
    throw new Error('Missing AppMountProvider');
  }

  return appMountContext;
};
