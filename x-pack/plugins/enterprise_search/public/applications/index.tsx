/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Redirect } from 'react-router-dom';

import { CoreStart, AppMountParams, HttpHandler } from 'src/core/public';
import { ClientConfigType, PluginsSetup } from '../plugin';
import { TSetBreadcrumbs } from './shared/kibana_breadcrumbs';
import { ILicense } from '../../../../licensing/public';
import { LicenseProvider } from './shared/licensing';

export interface IKibanaContext {
  enterpriseSearchUrl?: string;
  http(): HttpHandler;
  setBreadCrumbs(): TSetBreadcrumbs;
  license$: Observable<ILicense>;
}

export const KibanaContext = React.createContext();

/**
 * This file serves as a reusable wrapper to share Kibana-level context and other helpers
 * between various Enterprise Search plugins (e.g. AppSearch, WorkplaceSearch, ES landing page)
 * which should be imported and passed in as the first param in plugin.ts.
 */

export const renderApp = (
  App: React.Element,
  core: CoreStart,
  params: AppMountParams,
  config: ClientConfigType,
  plugins: PluginsSetup
) => {
  ReactDOM.render(
    <KibanaContext.Provider
      value={{
        http: core.http,
        enterpriseSearchUrl: config.host,
        setBreadcrumbs: core.chrome.setBreadcrumbs,
        license$: plugins.licensing.license$,
      }}
    >
      <LicenseProvider>
        <Router history={params.history}>
          <App />
        </Router>
      </LicenseProvider>
    </KibanaContext.Provider>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
