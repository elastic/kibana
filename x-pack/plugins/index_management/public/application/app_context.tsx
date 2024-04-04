/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import { Observable } from 'rxjs';
import SemVer from 'semver/classes/semver';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import {
  ApplicationStart,
  CoreTheme,
  FatalErrorsStart,
  ScopedHistory,
  DocLinksStart,
  IUiSettingsClient,
  ExecutionContextStart,
  HttpSetup,
} from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import { EuiBreadcrumb } from '@elastic/eui';
import { UiMetricService, NotificationService, HttpService } from './services';
import { IndexManagementBreadcrumb } from './services/breadcrumbs';
import { ExtensionsService } from '../services/extensions_service';

export const AppContext = createContext<AppDependencies | undefined>(undefined);

export interface AppDependencies {
  core: {
    fatalErrors: FatalErrorsStart;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    executionContext: ExecutionContextStart;
    application: ApplicationStart;
    http: HttpSetup;
  };
  plugins: {
    usageCollection: UsageCollectionSetup;
    isFleetEnabled: boolean;
    share: SharePluginStart;
    cloud?: CloudSetup;
    console?: ConsolePluginStart;
  };
  services: {
    uiMetricService: UiMetricService;
    extensionsService: ExtensionsService;
    httpService: HttpService;
    notificationService: NotificationService;
  };
  config: {
    enableIndexActions: boolean;
    enableLegacyTemplates: boolean;
    enableIndexStats: boolean;
    editableIndexSettings: 'all' | 'limited';
    enableDataStreamsStorageColumn: boolean;
  };
  history: ScopedHistory;
  setBreadcrumbs: (type: IndexManagementBreadcrumb, additionalBreadcrumb?: EuiBreadcrumb) => void;
  uiSettings: IUiSettingsClient;
  settings: SettingsStart;
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
