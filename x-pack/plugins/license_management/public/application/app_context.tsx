/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useContext } from 'react';
import type { CoreStart } from '../../../../../src/core/public/types';
import { ScopedHistory } from '../../../../../src/core/public/application/scoped_history';
import type { TelemetryPluginStart } from '../../../../../src/plugins/telemetry/public/plugin';
import type { ILicense } from '../../../licensing/common/types';
import type { LicensingPluginSetup } from '../../../licensing/public/types';
import type { ClientConfigType } from '../types';
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
