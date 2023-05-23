/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';

import { getContext, resetContext } from 'kea';
import { Store } from 'redux';

import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';

import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { DEFAULT_PRODUCT_FEATURES } from '../../common/constants';
import { ClientConfigType, InitialAppData, ProductAccess } from '../../common/types';
import { PluginsStart, ClientData } from '../plugin';

import { externalUrl } from './shared/enterprise_search_url';
import { mountFlashMessagesLogic, Toasts } from './shared/flash_messages';
import { getCloudEnterpriseSearchHost } from './shared/get_cloud_enterprise_search_host/get_cloud_enterprise_search_host';
import { mountHttpLogic } from './shared/http';
import { mountKibanaLogic } from './shared/kibana';
import { mountLicensingLogic } from './shared/licensing';

/**
 * This file serves as a reusable wrapper to share Kibana-level context and other helpers
 * between various Enterprise Search plugins (e.g. AppSearch, WorkplaceSearch, ES landing page)
 * which should be imported and passed in as the first param in plugin.ts.
 */

export const renderApp = (
  App: React.FC<InitialAppData>,
  {
    params,
    core,
    plugins,
    isSidebarEnabled = true,
  }: {
    core: CoreStart;
    isSidebarEnabled: boolean;
    params: AppMountParameters;
    plugins: PluginsStart;
  },
  { config, data }: { config: ClientConfigType; data: ClientData }
) => {
  const {
    access,
    appSearch,
    configuredLimits,
    enterpriseSearchVersion,
    errorConnectingMessage,
    features,
    kibanaVersion,
    publicUrl,
    readOnlyMode,
    searchOAuth,
    workplaceSearch,
  } = data;
  const { history } = params;
  const { application, chrome, http, uiSettings } = core;
  const { capabilities, navigateToUrl } = application;
  const { charts, cloud, guidedOnboarding, lens, security } = plugins;

  const entCloudHost = getCloudEnterpriseSearchHost(plugins.cloud);
  externalUrl.enterpriseSearchUrl = publicUrl || entCloudHost || config.host || '';

  const noProductAccess: ProductAccess = {
    hasAppSearchAccess: false,
    hasWorkplaceSearchAccess: false,
  };

  const productAccess = access || noProductAccess;
  const productFeatures = features ?? { ...DEFAULT_PRODUCT_FEATURES };

  const EmptyContext: FC = ({ children }) => <>{children}</>;
  const CloudContext = cloud?.CloudContextProvider || EmptyContext;

  resetContext({ createStore: true });
  const store = getContext().store;

  const unmountKibanaLogic = mountKibanaLogic({
    application,
    capabilities,
    charts,
    cloud,
    config,
    data: plugins.data,
    guidedOnboarding,
    history,
    isSidebarEnabled,
    lens,
    navigateToUrl,
    productAccess,
    productFeatures,
    renderHeaderActions: (HeaderActions) =>
      params.setHeaderActionMenu(
        HeaderActions ? renderHeaderActions.bind(null, HeaderActions, store) : undefined
      ),
    security,
    setBreadcrumbs: chrome.setBreadcrumbs,
    setChromeIsVisible: chrome.setIsVisible,
    setDocTitle: chrome.docTitle.change,
    uiSettings,
  });
  const unmountLicensingLogic = mountLicensingLogic({
    canManageLicense: core.application.capabilities.management?.stack?.license_management,
    license$: plugins.licensing.license$,
  });
  const unmountHttpLogic = mountHttpLogic({
    errorConnectingMessage,
    http,
    readOnlyMode,
  });
  const unmountFlashMessagesLogic = mountFlashMessagesLogic();

  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme$={params.theme$}>
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <CloudContext>
            <Provider store={store}>
              <Router history={params.history}>
                <App
                  access={productAccess}
                  appSearch={appSearch}
                  configuredLimits={configuredLimits}
                  enterpriseSearchVersion={enterpriseSearchVersion}
                  features={features}
                  kibanaVersion={kibanaVersion}
                  readOnlyMode={readOnlyMode}
                  searchOAuth={searchOAuth}
                  workplaceSearch={workplaceSearch}
                />
                <Toasts />
              </Router>
            </Provider>
          </CloudContext>
        </KibanaContextProvider>
      </KibanaThemeProvider>
    </I18nProvider>,
    params.element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
    unmountKibanaLogic();
    unmountLicensingLogic();
    unmountHttpLogic();
    unmountFlashMessagesLogic();
    plugins.data.search.session.clear();
  };
};

/**
 * Render function for Kibana's header action menu chrome -
 * reusable by any Enterprise Search plugin simply by passing in
 * a custom HeaderActions component (e.g., WorkplaceSearchHeaderActions)
 * @see https://github.com/elastic/kibana/blob/main/docs/development/core/public/kibana-plugin-core-public.appmountparameters.setheaderactionmenu.md
 */

export const renderHeaderActions = (
  HeaderActions: React.FC,
  store: Store,
  kibanaHeaderEl: HTMLElement
) => {
  ReactDOM.render(
    <Provider store={store}>
      <HeaderActions />
    </Provider>,
    kibanaHeaderEl
  );
  return () => ReactDOM.unmountComponentAtNode(kibanaHeaderEl);
};
