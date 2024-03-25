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

import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { AppMountParameters, CoreStart, HttpStart } from '@kbn/core/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import useLifecycles from 'react-use/lib/useLifecycles';
import useObservable from 'react-use/lib/useObservable';
import type { MlFeatures } from '../../common/constants/app';
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
import { EnabledFeaturesContextProvider } from './contexts/ml';
import type { StartServices } from './contexts/kibana';
import { fieldFormatServiceFactory } from './services/field_format_service_factory';
import { indexServiceFactory } from './util/index_service';

export type MlDependencies = Omit<
  MlSetupDependencies,
  'share' | 'fieldFormats' | 'maps' | 'cases' | 'licensing' | 'uiActions'
> &
  MlStartDependencies;

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
  appMountParams: AppMountParameters;
  isServerless: boolean;
  mlFeatures: MlFeatures;
}

const localStorage = new Storage(window.localStorage);

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(
  httpStart: HttpStart,
  dataViews: DataViewsContract,
  usageCollection?: UsageCollectionSetup
) {
  const httpService = new HttpService(httpStart);
  const mlApiServices = mlApiServicesProvider(httpService);
  // Note on the following services:
  // - `mlIndexUtils` is just instantiated here to be passed on to `mlFieldFormatService`,
  //   but it's not being made available as part of global services. Since it's just
  //   some stateless utils `useMlIndexUtils()` should be used from within components.
  // - `mlFieldFormatService` is a stateful legacy service that relied on "dependency cache",
  //   so because of its own state it needs to be made available as a global service.
  //   In the long run we should again try to get rid of it here and make it available via
  //   its own context or possibly without having a singleton like state at all, since the
  //   way this manages its own state right now doesn't consider React component lifecycles.
  const mlIndexUtils = indexServiceFactory(dataViews);
  const mlFieldFormatService = fieldFormatServiceFactory(mlApiServices, mlIndexUtils);

  return {
    httpService,
    mlApiServices,
    mlFieldFormatService,
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    mlCapabilities: new MlCapabilitiesService(mlApiServices),
    mlLicense: new MlLicense(),
  };
}

export interface MlServicesContext {
  mlServices: MlGlobalServices;
}

export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;

const App: FC<AppProps> = ({ coreStart, deps, appMountParams, isServerless, mlFeatures }) => {
  const pageDeps: PageDependencies = {
    history: appMountParams.history,
    setHeaderActionMenu: appMountParams.setHeaderActionMenu,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
  };

  const chromeStyle = useObservable(coreStart.chrome.getChromeStyle$(), 'classic');

  const services: StartServices = useMemo(() => {
    return {
      ...coreStart,
      cases: deps.cases,
      charts: deps.charts,
      contentManagement: deps.contentManagement,
      dashboard: deps.dashboard,
      data: deps.data,
      dataViewEditor: deps.dataViewEditor,
      dataViews: deps.data.dataViews,
      dataVisualizer: deps.dataVisualizer,
      embeddable: deps.embeddable,
      fieldFormats: deps.fieldFormats,
      kibanaVersion: deps.kibanaVersion,
      lens: deps.lens,
      licenseManagement: deps.licenseManagement,
      maps: deps.maps,
      presentationUtil: deps.presentationUtil,
      savedObjectsManagement: deps.savedObjectsManagement,
      savedSearch: deps.savedSearch,
      security: deps.security,
      share: deps.share,
      storage: localStorage,
      triggersActionsUi: deps.triggersActionsUi,
      uiActions: deps.uiActions,
      unifiedSearch: deps.unifiedSearch,
      usageCollection: deps.usageCollection,
      mlServices: getMlGlobalServices(coreStart.http, deps.data.dataViews, deps.usageCollection),
    };
  }, [deps, coreStart]);

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
    showFrozenDataTierChoice: !isServerless,
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
                <EnabledFeaturesContextProvider
                  isServerless={isServerless}
                  mlFeatures={mlFeatures}
                  showMLNavMenu={chromeStyle === 'classic'}
                >
                  <MlRouter pageDeps={pageDeps} />
                </EnabledFeaturesContextProvider>
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
  isServerless: boolean,
  mlFeatures: MlFeatures
) => {
  setDependencyCache({
    timefilter: deps.data.query.timefilter,
    fieldFormats: deps.fieldFormats,
    config: coreStart.uiSettings!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    recentlyAccessed: coreStart.chrome!.recentlyAccessed,
    application: coreStart.application,
    http: coreStart.http,
    maps: deps.maps,
  });

  appMountParams.onAppLeave((actions) => actions.default());

  ReactDOM.render(
    <App
      coreStart={coreStart}
      deps={deps}
      appMountParams={appMountParams}
      isServerless={isServerless}
      mlFeatures={mlFeatures}
    />,
    appMountParams.element
  );

  return () => {
    clearCache();
    ReactDOM.unmountComponentAtNode(appMountParams.element);
    deps.data.search.session.clear();
  };
};
