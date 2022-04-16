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

import { InitialAppData } from '../../common/types';
import { PluginsStart, ClientConfigType, ClientData } from '../plugin';

import { externalUrl } from './shared/enterprise_search_url';
import { mountFlashMessagesLogic, Toasts } from './shared/flash_messages';
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
  { params, core, plugins }: { params: AppMountParameters; core: CoreStart; plugins: PluginsStart },
  { config, data }: { config: ClientConfigType; data: ClientData }
) => {
  const { publicUrl, errorConnectingMessage, ...initialData } = data;
  externalUrl.enterpriseSearchUrl = publicUrl || config.host || '';

  const EmptyContext: FC = ({ children }) => <>{children}</>;
  const CloudContext = plugins.cloud?.CloudContextProvider || EmptyContext;

  resetContext({ createStore: true });
  const store = getContext().store;

  const unmountKibanaLogic = mountKibanaLogic({
    config,
    charts: plugins.charts,
    cloud: plugins.cloud,
    history: params.history,
    navigateToUrl: core.application.navigateToUrl,
    security: plugins.security,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
    setChromeIsVisible: core.chrome.setIsVisible,
    setDocTitle: core.chrome.docTitle.change,
    renderHeaderActions: (HeaderActions) =>
      params.setHeaderActionMenu((el) => renderHeaderActions(HeaderActions, store, el)),
  });
  const unmountLicensingLogic = mountLicensingLogic({
    license$: plugins.licensing.license$,
    canManageLicense: core.application.capabilities.management?.stack?.license_management,
  });
  const unmountHttpLogic = mountHttpLogic({
    http: core.http,
    errorConnectingMessage,
    readOnlyMode: initialData.readOnlyMode,
  });
  const unmountFlashMessagesLogic = mountFlashMessagesLogic();

  ReactDOM.render(
    <I18nProvider>
      <KibanaThemeProvider theme$={params.theme$}>
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <CloudContext>
            <Provider store={store}>
              <Router history={params.history}>
                <App {...initialData} />
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
