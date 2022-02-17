/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';

import { CoreStart, ScopedHistory, CoreTheme } from '../../../../../src/core/public';
import { ClientConfigType } from '../types';
import { HttpService, UiMetricService } from './services';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: CoreStart;
  services: {
    httpService: HttpService;
    uiMetricService: UiMetricService;
    i18n: typeof i18n;
    history: ScopedHistory;
  };
  config: ClientConfigType;
  theme$: Observable<CoreTheme>;
}

export const AppContextProvider = ({
  children,
  value,
}: {
  value: AppDependencies;
  children: React.ReactNode;
}) => {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const AppContextConsumer = AppContext.Consumer;

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('"useAppContext" can only be called inside of AppContext.Provider!');
  }
  return ctx;
};

export const useServices = () => useAppContext().services;

export const useCore = () => useAppContext().core;

export const useConfig = () => useAppContext().config;

export const useToastNotifications = () => {
  const {
    notifications: { toasts: toastNotifications },
  } = useCore();

  return toastNotifications;
};
