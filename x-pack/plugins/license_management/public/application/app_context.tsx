/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { Observable } from 'rxjs';

import { CoreStart, ScopedHistory, CoreTheme } from '@kbn/core/public';
import { LicensingPluginSetup, ILicense } from '@kbn/licensing-plugin/public';
import { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import { ClientConfigType } from '../types';
import { BreadcrumbService } from './breadcrumbs';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: CoreStart;
  services: {
    breadcrumbService: BreadcrumbService;
    history: ScopedHistory;
  };
  plugins: {
    licensing: LicensingPluginSetup;
    telemetry?: TelemetryPluginStart;
  };
  docLinks: {
    security: string;
  };
  store: {
    initialLicense: ILicense;
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
