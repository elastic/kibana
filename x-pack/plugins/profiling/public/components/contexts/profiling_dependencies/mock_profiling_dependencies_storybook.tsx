/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/react';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import React, { ReactNode } from 'react';
import { Observable } from 'rxjs';
import { ProfilingDependenciesContextProvider } from './profiling_dependencies_context';

const urlService = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
  shortUrls: () => ({ get: () => {} } as any),
});
const locator = urlService.locators.create(new MlLocatorDefinition());

const mockPlugin = {
  ml: {
    locator,
  },
  data: {
    query: {
      timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
    },
  },
};

const mockCore = {
  application: {
    currentAppId$: new Observable(),
    getUrlForApp: (appId: string) => '',
    navigateToUrl: (url: string) => {},
  },
  chrome: {
    docTitle: { change: () => {} },
    setBreadcrumbs: () => {},
    setHelpExtension: () => {},
    setBadge: () => {},
  },
  docLinks: {
    DOC_LINK_VERSION: 'current',
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    links: { observability: { guide: '' } },
  },
  http: {
    basePath: {
      prepend: (path: string) => `/basepath${path}`,
      get: () => '/basepath',
    },
  },
  i18n: {
    Context: ({ children }: { children: ReactNode }) => children,
  },
  notifications: {
    toasts: {
      addWarning: () => {},
      addDanger: () => {},
      add: () => {},
    },
  },
};

const mockProfilingDependenciesContext = {
  core: mockCore,
  plugins: mockPlugin,
} as any;

export function MockProfilingDependenciesStorybook({ children }: { children?: ReactNode }) {
  const KibanaReactContext = createKibanaReactContext(
    mockProfilingDependenciesContext.core as unknown as Partial<CoreStart>
  );

  return (
    <EuiThemeProvider darkMode={false}>
      <KibanaReactContext.Provider>
        <ProfilingDependenciesContextProvider
          // We should keep adding more stuff to the mock object as we need
          value={{ start: mockProfilingDependenciesContext, setup: {} as any, services: {} as any }}
        >
          {children}
        </ProfilingDependenciesContextProvider>
      </KibanaReactContext.Provider>
    </EuiThemeProvider>
  );
}
