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

import { AppMountParameters, CoreStart } from 'src/core/public';
import { PluginsStart, ClientConfigType, ClientData } from '../plugin';
import { IInitialAppData } from '../../common/types';

import { mountKibanaLogic } from './shared/kibana';
import { mountLicensingLogic } from './shared/licensing';
import { mountHttpLogic } from './shared/http';
import { mountFlashMessagesLogic } from './shared/flash_messages';
import { externalUrl } from './shared/enterprise_search_url';

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
  const store = getContext().store;

  const unmountKibanaLogic = mountKibanaLogic({
    config,
    history: params.history,
    navigateToUrl: core.application.navigateToUrl,
    setBreadcrumbs: core.chrome.setBreadcrumbs,
    setDocTitle: core.chrome.docTitle.change,
    renderHeaderActions: (HeaderActions) =>
      params.setHeaderActionMenu((el) => renderHeaderActions(HeaderActions, store, el)),
  });
  const unmountLicensingLogic = mountLicensingLogic({
    license$: plugins.licensing.license$,
  });
  const unmountHttpLogic = mountHttpLogic({
    http: core.http,
    errorConnecting,
    readOnlyMode: initialData.readOnlyMode,
  });
  const unmountFlashMessagesLogic = mountFlashMessagesLogic();

  ReactDOM.render(
    <I18nProvider>
      <Provider store={store}>
        <Router history={params.history}>
          <App {...initialData} />
        </Router>
      </Provider>
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
