/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, Redirect } from 'react-router-dom';

import { CoreStart, AppMountParams, HttpHandler } from 'src/core/public';
import { ClientConfigType, PluginsSetup } from '../plugin';
import { TSetBreadcrumbs } from './shared/kibana_breadcrumbs';
import { ILicense } from '../../../../licensing/public';
import { LicenseProvider } from './shared/licensing';

import { AppSearch } from './app_search';

export interface IKibanaContext {
  enterpriseSearchUrl?: string;
  http(): HttpHandler;
  setBreadCrumbs(): TSetBreadcrumbs;
  license$: Observable<ILicense>;
}

export const KibanaContext = React.createContext();

export const renderApp = (
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
        <BrowserRouter basename={params.appBasePath}>
          <Route exact path="/">
            {/* This will eventually contain an Enterprise Search landing page,
            and we'll also actually have a /workplace_search route */}
            <Redirect to="/app_search" />
          </Route>
          <Route path="/app_search">
            <AppSearch />
          </Route>
        </BrowserRouter>
      </LicenseProvider>
    </KibanaContext.Provider>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
