/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { Observable } from 'rxjs';
import SemVer from 'semver/classes/semver';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import {
  ApplicationStart,
  CoreTheme,
  FatalErrorsStart,
  ScopedHistory,
  DocLinksStart,
  IUiSettingsClient,
  ExecutionContextStart,
} from '@kbn/core/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import { ExtensionsService } from '../services';
import { UiMetricService, NotificationService, HttpService } from './services';

const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: {
    fatalErrors: FatalErrorsStart;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    executionContext: ExecutionContextStart;
  };
  plugins: {
    usageCollection: UsageCollectionSetup;
    isFleetEnabled: boolean;
  };
  services: {
    uiMetricService: UiMetricService;
    extensionsService: ExtensionsService;
    httpService: HttpService;
    notificationService: NotificationService;
  };
  history: ScopedHistory;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
  uiSettings: IUiSettingsClient;
  url: SharePluginStart['url'];
  docLinks: DocLinksStart;
  kibanaVersion: SemVer;
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
