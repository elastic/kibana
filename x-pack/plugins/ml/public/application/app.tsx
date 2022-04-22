/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import './_index.scss';
import ReactDOM from 'react-dom';

import { AppMountParameters, CoreStart, HttpStart } from '@kbn/core/public';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { setDependencyCache, clearCache } from './util/dependency_cache';
import { setLicenseCache } from './license';
import type { MlSetupDependencies, MlStartDependencies } from '../plugin';
import { mlUsageCollectionProvider } from './services/usage_collection';

import { MlRouter } from './routing';
import { mlApiServicesProvider } from './services/ml_api_service';
import { HttpService } from './services/http_service';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';

export type MlDependencies = Omit<MlSetupDependencies, 'share' | 'fieldFormats' | 'maps'> &
  MlStartDependencies;

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
  appMountParams: AppMountParameters;
}

const localStorage = new Storage(window.localStorage);

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(httpStart: HttpStart, usageCollection?: UsageCollectionSetup) {
  const httpService = new HttpService(httpStart);
  return {
    httpService,
    mlApiServices: mlApiServicesProvider(httpService),
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
  };
}

export interface MlServicesContext {
  mlServices: MlGlobalServices;
}

export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;

const App: FC<AppProps> = ({ coreStart, deps, appMountParams }) => {
  const redirectToMlAccessDeniedPage = async () => {
    const accessDeniedPageUrl = await deps.share.url.locators.get(ML_APP_LOCATOR)!.getUrl({
      page: ML_PAGES.ACCESS_DENIED,
    });
    await coreStart.application.navigateToUrl(accessDeniedPageUrl);
  };

  const pageDeps = {
    history: appMountParams.history,
    setHeaderActionMenu: appMountParams.setHeaderActionMenu,
    dataViewsContract: deps.data.dataViews,
    config: coreStart.uiSettings!,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
    redirectToMlAccessDeniedPage,
  };

  const services = {
    kibanaVersion: deps.kibanaVersion,
    share: deps.share,
    data: deps.data,
    security: deps.security,
    licenseManagement: deps.licenseManagement,
    storage: localStorage,
    embeddable: deps.embeddable,
    maps: deps.maps,
    triggersActionsUi: deps.triggersActionsUi,
    dataVisualizer: deps.dataVisualizer,
    usageCollection: deps.usageCollection,
    fieldFormats: deps.fieldFormats,
    dashboard: deps.dashboard,
    charts: deps.charts,
    ...coreStart,
  };

  const I18nContext = coreStart.i18n.Context;
  const ApplicationUsageTrackingProvider =
    deps.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  return (
    <ApplicationUsageTrackingProvider>
      <I18nContext>
        <KibanaThemeProvider theme$={appMountParams.theme$}>
          <KibanaContextProvider
            services={{
              ...services,
              mlServices: getMlGlobalServices(coreStart.http, deps.usageCollection),
            }}
          >
            <MlRouter pageDeps={pageDeps} />
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </ApplicationUsageTrackingProvider>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: MlDependencies,
  appMountParams: AppMountParameters
) => {
  setDependencyCache({
    timefilter: deps.data.query.timefilter,
    fieldFormats: deps.fieldFormats,
    autocomplete: deps.unifiedSearch.autocomplete,
    config: coreStart.uiSettings!,
    chrome: coreStart.chrome!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    overlays: coreStart.overlays,
    theme: coreStart.theme,
    recentlyAccessed: coreStart.chrome!.recentlyAccessed,
    basePath: coreStart.http.basePath,
    savedObjectsClient: coreStart.savedObjects.client,
    application: coreStart.application,
    http: coreStart.http,
    security: deps.security,
    dashboard: deps.dashboard,
    maps: deps.maps,
    dataVisualizer: deps.dataVisualizer,
    dataViews: deps.data.dataViews,
  });

  appMountParams.onAppLeave((actions) => actions.default());

  const mlLicense = setLicenseCache(deps.licensing, [
    () =>
      ReactDOM.render(
        <App coreStart={coreStart} deps={deps} appMountParams={appMountParams} />,
        appMountParams.element
      ),
  ]);

  return () => {
    mlLicense.unsubscribe();
    clearCache();
    ReactDOM.unmountComponentAtNode(appMountParams.element);
    deps.data.search.session.clear();
  };
};
