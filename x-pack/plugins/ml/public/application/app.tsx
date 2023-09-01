/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';
import './_index.scss';
import ReactDOM from 'react-dom';
import { pick } from 'lodash';

import type { AppMountParameters, CoreStart, HttpStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import useLifecycles from 'react-use/lib/useLifecycles';
import useObservable from 'react-use/lib/useObservable';
import { MlLicense } from '../../common/license';
import { MlCapabilitiesService } from './capabilities/check_capabilities';
import { ML_STORAGE_KEYS } from '../../common/types/storage';
import type { MlSetupDependencies, MlStartDependencies } from '../plugin';
import { clearCache, setDependencyCache } from './util/dependency_cache';
import { setLicenseCache } from './license';
import { mlUsageCollectionProvider } from './services/usage_collection';
import { MlRouter } from './routing';
import { mlApiServicesProvider } from './services/ml_api_service';
import { HttpService } from './services/http_service';
import type { PageDependencies } from './routing/router';

export type MlDependencies = Omit<
  MlSetupDependencies,
  'share' | 'fieldFormats' | 'maps' | 'cases' | 'licensing'
> &
  MlStartDependencies;

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
  appMountParams: AppMountParameters;
  isServerless: boolean;
}

const localStorage = new Storage(window.localStorage);

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(
  httpStart: HttpStart,
  isServerless: boolean,
  usageCollection?: UsageCollectionSetup
) {
  const httpService = new HttpService(httpStart);
  const mlApiServices = mlApiServicesProvider(httpService);

  return {
    httpService,
    mlApiServices,
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    mlCapabilities: new MlCapabilitiesService(mlApiServices),
    mlLicense: new MlLicense(),
    isServerless,
  };
}

export interface MlServicesContext {
  mlServices: MlGlobalServices;
}

export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;

const App: FC<AppProps> = ({ coreStart, deps, appMountParams, isServerless }) => {
  const pageDeps: PageDependencies = {
    history: appMountParams.history,
    setHeaderActionMenu: appMountParams.setHeaderActionMenu,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
  };

  const services = useMemo(() => {
    return {
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
      cases: deps.cases,
      unifiedSearch: deps.unifiedSearch,
      licensing: deps.licensing,
      lens: deps.lens,
      savedObjectsManagement: deps.savedObjectsManagement,
      savedSearch: deps.savedSearch,
      contentManagement: deps.contentManagement,
      presentationUtil: deps.presentationUtil,
      ...coreStart,
      mlServices: getMlGlobalServices(coreStart.http, isServerless, deps.usageCollection),
    };
  }, [deps, coreStart, isServerless]);

  useLifecycles(
    function setupLicenseOnMount() {
      setLicenseCache(services.mlServices.mlLicense);
      services.mlServices.mlLicense.setup(deps.licensing.license$);
    },
    function destroyLicenseOnUnmount() {
      services.mlServices.mlLicense.unsubscribe();
    }
  );

  // Wait for license and capabilities to be retrieved before rendering the app.
  const licenseReady = useObservable(services.mlServices.mlLicense.isLicenseReady$, false);
  const mlCapabilities = useObservable(
    services.mlServices.mlCapabilities.capabilities$,
    services.mlServices.mlCapabilities.getCapabilities()
  );

  if (!licenseReady || !mlCapabilities) return null;

  const datePickerDeps: DatePickerDependencies = {
    ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    isServerless,
  };

  const I18nContext = coreStart.i18n.Context;
  const ApplicationUsageTrackingProvider =
    deps.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  return (
    <ApplicationUsageTrackingProvider>
      <I18nContext>
        <KibanaThemeProvider theme$={appMountParams.theme$}>
          <KibanaContextProvider services={services}>
            <StorageContextProvider storage={localStorage} storageKeys={ML_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <MlRouter pageDeps={pageDeps} />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </ApplicationUsageTrackingProvider>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: MlDependencies,
  appMountParams: AppMountParameters,
  isServerless: boolean
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
    savedSearch: deps.savedSearch,
    application: coreStart.application,
    http: coreStart.http,
    security: deps.security,
    dashboard: deps.dashboard,
    maps: deps.maps,
    dataVisualizer: deps.dataVisualizer,
    dataViews: deps.data.dataViews,
    share: deps.share,
    lens: deps.lens,
  });

  appMountParams.onAppLeave((actions) => actions.default());

  ReactDOM.render(
    <App
      coreStart={coreStart}
      deps={deps}
      appMountParams={appMountParams}
      isServerless={isServerless}
    />,
    appMountParams.element
  );

  return () => {
    clearCache();
    ReactDOM.unmountComponentAtNode(appMountParams.element);
    deps.data.search.session.clear();
  };
};
