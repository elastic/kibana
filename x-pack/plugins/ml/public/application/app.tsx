/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters, CoreStart, HttpStart } from 'kibana/public';

import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { setDependencyCache, clearCache } from './util/dependency_cache';
import { setLicenseCache } from './license';
import { MlSetupDependencies, MlStartDependencies } from '../plugin';

import { MlRouter } from './routing';
import { mlApiServicesProvider } from './services/ml_api_service';
import { HttpService } from './services/http_service';

type MlDependencies = MlSetupDependencies & MlStartDependencies;

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
}

const localStorage = new Storage(window.localStorage);

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(httpStart: HttpStart) {
  const httpService = new HttpService(httpStart);
  return {
    httpService,
    mlApiServices: mlApiServicesProvider(httpService),
  };
}

export interface MlServicesContext {
  mlServices: MlGlobalServices;
}

export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;

const App: FC<AppProps> = ({ coreStart, deps }) => {
  const pageDeps = {
    indexPatterns: deps.data.indexPatterns,
    config: coreStart.uiSettings!,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
  };
  const services = {
    appName: 'ML',
    kibanaVersion: deps.kibanaVersion,
    share: deps.share,
    data: deps.data,
    security: deps.security,
    licenseManagement: deps.licenseManagement,
    storage: localStorage,
    ...coreStart,
  };

  const I18nContext = coreStart.i18n.Context;
  return (
    <I18nContext>
      <KibanaContextProvider
        services={{ ...services, mlServices: getMlGlobalServices(coreStart.http) }}
      >
        <MlRouter pageDeps={pageDeps} />
      </KibanaContextProvider>
    </I18nContext>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: MlDependencies,
  appMountParams: AppMountParameters
) => {
  setDependencyCache({
    indexPatterns: deps.data.indexPatterns,
    timefilter: deps.data.query.timefilter,
    fieldFormats: deps.data.fieldFormats,
    autocomplete: deps.data.autocomplete,
    config: coreStart.uiSettings!,
    chrome: coreStart.chrome!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    overlays: coreStart.overlays,
    recentlyAccessed: coreStart.chrome!.recentlyAccessed,
    basePath: coreStart.http.basePath,
    savedObjectsClient: coreStart.savedObjects.client,
    application: coreStart.application,
    http: coreStart.http,
    security: deps.security,
    urlGenerators: deps.share.urlGenerators,
  });

  deps.kibanaLegacy.loadFontAwesome();

  appMountParams.onAppLeave((actions) => actions.default());

  const mlLicense = setLicenseCache(deps.licensing, [
    () => ReactDOM.render(<App coreStart={coreStart} deps={deps} />, appMountParams.element),
  ]);

  return () => {
    mlLicense.unsubscribe();
    clearCache();
    ReactDOM.unmountComponentAtNode(appMountParams.element);
  };
};
