/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { Provider } from 'react-redux';
import { Store } from 'redux';
import { getContext, resetContext } from 'kea';

import { I18nProvider } from '@kbn/i18n/react';
import { AppMountParameters, CoreStart, ApplicationStart, ChromeBreadcrumb } from 'src/core/public';
import { PluginsStart, ClientConfigType, ClientData } from '../plugin';

import { mountKibanaLogic } from './shared/kibana';
import { mountLicensingLogic } from './shared/licensing';
import { mountHttpLogic } from './shared/http';
import { mountFlashMessagesLogic } from './shared/flash_messages';
import { externalUrl } from './shared/enterprise_search_url';
import { IInitialAppData } from '../../common/types';

export interface IKibanaContext {
  config: { host?: string };
  navigateToUrl: ApplicationStart['navigateToUrl'];
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setDocTitle(title: string): void;
}

export const KibanaContext = React.createContext({});

/**
 * This file serves as a reusable wrapper to share Kibana-level context and other helpers
 * between various Enterprise Search plugins (e.g. AppSearch, WorkplaceSearch, ES landing page)
 * which should be imported and passed in as the first param in plugin.ts.
 */

export const renderApp = (
  App: React.FC<IInitialAppData>,
  { params, core, plugins }: { params: AppMountParameters; core: CoreStart; plugins: PluginsStart },
  { config, data }: { config: ClientConfigType; data: ClientData }
) => {
  const { publicUrl, errorConnecting, ...initialData } = data;
  externalUrl.enterpriseSearchUrl = publicUrl || config.host || '';

  resetContext({ createStore: true });
  const store = getContext().store as Store;

  const unmountKibanaLogic = mountKibanaLogic({
    config,
    navigateToUrl: core.application.navigateToUrl,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
    setDocTitle: core.chrome.docTitle.change,
  });

  const unmountLicensingLogic = mountLicensingLogic({
    license$: plugins.licensing.license$,
  });

  const unmountHttpLogic = mountHttpLogic({
    http: core.http,
    errorConnecting,
    readOnlyMode: initialData.readOnlyMode,
  });

  const unmountFlashMessagesLogic = mountFlashMessagesLogic({ history: params.history });

  ReactDOM.render(
    <I18nProvider>
      <KibanaContext.Provider
        value={{
          config,
          navigateToUrl: core.application.navigateToUrl,
          setBreadcrumbs: core.chrome.setBreadcrumbs,
          setDocTitle: core.chrome.docTitle.change,
        }}
      >
        <Provider store={store}>
          <Router history={params.history}>
            <App {...initialData} />
          </Router>
        </Provider>
      </KibanaContext.Provider>
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
 * @see https://github.com/elastic/kibana/blob/master/docs/development/core/public/kibana-plugin-core-public.appmountparameters.setheaderactionmenu.md
 */

export const renderHeaderActions = (HeaderActions: React.FC, kibanaHeaderEl: HTMLElement) => {
  ReactDOM.render(<HeaderActions />, kibanaHeaderEl);
  return () => ReactDOM.unmountComponentAtNode(kibanaHeaderEl);
};
