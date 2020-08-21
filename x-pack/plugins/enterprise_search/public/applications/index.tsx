/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';

import { I18nProvider } from '@kbn/i18n/react';
import {
  AppMountParameters,
  CoreStart,
  ApplicationStart,
  HttpSetup,
  ChromeBreadcrumb,
} from 'src/core/public';
import { ClientConfigType, ClientData, PluginsSetup } from '../plugin';
import { LicenseProvider } from './shared/licensing';
import { IExternalUrl } from './shared/enterprise_search_url';

export interface IKibanaContext {
  config: { host?: string };
  externalUrl: IExternalUrl;
  http: HttpSetup;
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
  App: React.FC,
  params: AppMountParameters,
  core: CoreStart,
  plugins: PluginsSetup,
  config: ClientConfigType,
  data: ClientData
) => {
  ReactDOM.render(
    <I18nProvider>
      <KibanaContext.Provider
        value={{
          config,
          http: core.http,
          navigateToUrl: core.application.navigateToUrl,
          externalUrl: data.externalUrl,
          setBreadcrumbs: core.chrome.setBreadcrumbs,
          setDocTitle: core.chrome.docTitle.change,
        }}
      >
        <LicenseProvider license$={plugins.licensing.license$}>
          <Router history={params.history}>
            <App />
          </Router>
        </LicenseProvider>
      </KibanaContext.Provider>
    </I18nProvider>,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
};
