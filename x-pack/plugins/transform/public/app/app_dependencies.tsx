/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';

import { CoreSetup, CoreStart } from '../../../../../src/core/public';

import { API_BASE_PATH } from '../../common/constants';

import { setDependencyCache } from '../shared_imports';

import { AuthorizationProvider } from './lib/authorization';

export interface AppDependencies {
  chrome: CoreStart['chrome'];
  data: any;
  docLinks: CoreStart['docLinks'];
  http: CoreSetup['http'];
  i18n: CoreStart['i18n'];
  notifications: CoreStart['notifications'];
  uiSettings: CoreStart['uiSettings'];
  savedObjects: CoreStart['savedObjects'];
  overlays: CoreStart['overlays'];
}

let DependenciesContext: React.Context<AppDependencies>;

const setAppDependencies = (deps: AppDependencies) => {
  const legacyBasePath = {
    prepend: deps.http.basePath.prepend,
    get: deps.http.basePath.get,
    remove: () => {},
  };

  setDependencyCache({
    autocomplete: deps.data.autocomplete,
    docLinks: deps.docLinks,
    basePath: legacyBasePath as any,
  });
  DependenciesContext = createContext<AppDependencies>(deps);
  return DependenciesContext.Provider;
};

export const useAppDependencies = () => {
  if (!DependenciesContext) {
    throw new Error(`The app dependencies Context hasn't been set.
    Use the "setAppDependencies()" method when bootstrapping the app.`);
  }
  return useContext<AppDependencies>(DependenciesContext);
};

export const useToastNotifications = () => {
  const {
    notifications: { toasts: toastNotifications },
  } = useAppDependencies();
  return toastNotifications;
};

export const getAppProviders = (deps: AppDependencies) => {
  const I18nContext = deps.i18n.Context;

  // Create App dependencies context and get its provider
  const AppDependenciesProvider = setAppDependencies(deps);

  return ({ children }: { children: ReactNode }) => (
    <AuthorizationProvider privilegesEndpoint={`${API_BASE_PATH}privileges`}>
      <I18nContext>
        <HashRouter>
          <AppDependenciesProvider value={deps}>{children}</AppDependenciesProvider>
        </HashRouter>
      </I18nContext>
    </AuthorizationProvider>
  );
};
