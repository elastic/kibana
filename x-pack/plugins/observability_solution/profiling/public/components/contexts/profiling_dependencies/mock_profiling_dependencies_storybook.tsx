/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { createMemoryHistory } from 'history';
import { merge } from 'lodash';
import React, { ReactNode } from 'react';
import { Observable } from 'rxjs';
import { RouterProvider } from '@kbn/typed-react-router-config';
import {
  ProfilingDependencies,
  ProfilingDependenciesContextProvider,
} from './profiling_dependencies_context';
import { profilingRouter } from '../../../routing';
import { TimeRangeContextProvider } from '../time_range_context';
import { getServices } from '../../../services';

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
  uiSettings: { get: () => {} },
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

export function MockProfilingDependenciesStorybook({
  children,
  profilingContext,
  routePath,
  mockServices = {},
}: {
  children?: ReactNode;
  profilingContext?: Partial<ProfilingDependencies['start']>;
  mockServices?: Partial<ProfilingDependencies['services']>;
  routePath?: string;
}) {
  const contextMock = merge({}, mockProfilingDependenciesContext, profilingContext);

  const KibanaReactContext = createKibanaReactContext(
    mockProfilingDependenciesContext.core as unknown as Partial<CoreStart>
  );

  const history = createMemoryHistory({
    initialEntries: [routePath || '/stacktraces'],
  });

  const services = getServices();

  return (
    <EuiThemeProvider darkMode={false}>
      <KibanaReactContext.Provider>
        <RouterProvider router={profilingRouter as any} history={history}>
          <TimeRangeContextProvider>
            <ProfilingDependenciesContextProvider
              // We should keep adding more stuff to the mock object as we need
              value={{
                start: contextMock,
                setup: {} as any,
                services: merge({}, services, mockServices),
              }}
            >
              {children}
            </ProfilingDependenciesContextProvider>
          </TimeRangeContextProvider>
        </RouterProvider>
      </KibanaReactContext.Provider>
    </EuiThemeProvider>
  );
}
