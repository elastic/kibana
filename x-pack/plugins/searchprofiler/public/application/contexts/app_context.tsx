/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, createContext, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { HttpSetup, ToastsSetup } from 'kibana/public';
import { LicenseStatus } from '../../../common';

export interface ContextArgs {
  http: HttpSetup;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
  location: RouteComponentProps['location'];
}

export interface ContextValue {
  http: HttpSetup;
  notifications: ToastsSetup;
  getLicenseStatus: () => LicenseStatus;
  location: RouteComponentProps['location'];
}

const AppContext = createContext<ContextValue>(null as any);

export const AppContextProvider = ({
  children,
  args: { http, notifications, initialLicenseStatus, location },
}: {
  children: React.ReactNode;
  args: ContextArgs;
}) => {
  const getLicenseStatus = useCallback(() => initialLicenseStatus, [initialLicenseStatus]);

  return (
    <AppContext.Provider
      value={{
        http,
        notifications,
        getLicenseStatus,
        location,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (ctx == null) {
    throw new Error(`useAppContext must be called inside AppContextProvider`);
  }
  return ctx;
};
