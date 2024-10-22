/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { CoreStart } from '@kbn/core/public';
import { render, screen } from '@testing-library/react';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/observability-shared-plugin/public/hooks/use_kibana_ui_settings';
import { UrlService } from '@kbn/share-plugin/common/url_service';
import { createMemoryHistory } from 'history';
import { merge, noop } from 'lodash';
import { enableInspectEsQueries } from '@kbn/observability-plugin/common';
import {
  APMServiceContext,
  APMServiceContextValue,
} from '@kbn/apm-plugin/public/context/apm_service/apm_service_context';
import { getMockInventoryContext } from '../../../.storybook/get_mock_inventory_context';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { Observable, of } from 'rxjs';
import { inventoryRouter } from '../../routes/config';
import { GroupSelector } from './group_selector';
import {
  ApmPluginContext,
  ApmPluginContextValue,
} from '@kbn/apm-plugin/public/context/apm_plugin/apm_plugin_context';
import { MlLocatorDefinition } from '@kbn/ml-plugin/public';
import { IntlProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

const urlService = new UrlService({
  navigate: async () => {},
  getUrl: async ({ app, path }, { absolute }) => {
    return `${absolute ? 'http://localhost:8888' : ''}/app/${app}${path}`;
  },
  shortUrls: () => ({ get: () => {} } as any),
});

const locator = urlService.locators.create(new MlLocatorDefinition());

const uiSettings: Record<string, unknown> = {
  [UI_SETTINGS.TIMEPICKER_QUICK_RANGES]: [
    {
      from: 'now/d',
      to: 'now/d',
      display: 'Today',
    },
    {
      from: 'now/w',
      to: 'now/w',
      display: 'This week',
    },
  ],
  [UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS]: {
    from: 'now-15m',
    to: 'now',
  },
  [UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS]: {
    pause: false,
    value: 100000,
  },
  [enableInspectEsQueries]: false,
};

const mockPlugin = {
  ml: {
    locator,
  },
  data: {
    query: {
      timefilter: { timefilter: { setTime: () => {}, getTime: () => ({}) } },
    },
  },
  share: {
    url: {
      locators: {
        get: jest.fn(),
      },
    },
  },
};

const mockCore = {
  application: {
    capabilities: {
      apm: {},
      ml: {},
      savedObjectsManagement: {},
    },
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
    DOC_LINK_VERSION: '0',
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    links: {
      apm: {},
      observability: { guide: '' },
    },
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
  uiSettings: {
    get: (key: string) => uiSettings[key],
    get$: (key: string) => of(mockCore.uiSettings.get(key)),
  },
  unifiedSearch: {
    autocomplete: {
      hasQuerySuggestions: () => Promise.resolve(false),
      getQuerySuggestions: () => [],
      getValueSuggestions: () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve([]);
          }, 300);
        }),
    },
  },
  data: {
    query: {
      queryString: { getQuery: jest.fn(), setQuery: jest.fn(), clearQuery: jest.fn() },
      timefilter: {
        timefilter: {
          setTime: jest.fn(),
          setRefreshInterval: jest.fn(),
        },
      },
    },
  },
  dataViews: {
    create: jest.fn(),
  },
};

const mockUnifiedSearchBar = {
  ui: {
    SearchBar: () => <div />,
  },
};

const mockApmPluginContext = {
  core: mockCore,
  plugins: mockPlugin,
  unifiedSearch: mockUnifiedSearchBar,
  observabilityAIAssistant: {
    service: { setScreenContext: () => noop },
  },
  share: {
    url: {
      locators: {
        get: jest.fn(),
      },
    },
  },
} as unknown as ApmPluginContextValue;

describe('GroupSelector', () => {
  beforeEach(() => {
    const context = merge({}, mockApmPluginContext, getMockInventoryContext());
    const KibanaReactContext = createKibanaReactContext(
      context.core as unknown as Partial<CoreStart>
    );

    const history = createMemoryHistory({
      initialEntries: ['/'],
    });
    render(
      <IntlProvider locale="en">
        <EuiThemeProvider>
          <KibanaReactContext.Provider>
            <ApmPluginContext.Provider value={context}>
              <APMServiceContext.Provider value={{} as APMServiceContextValue}>
                <RouterProvider router={inventoryRouter as any} history={history}>
                  <GroupSelector />
                </RouterProvider>
              </APMServiceContext.Provider>
            </ApmPluginContext.Provider>
          </KibanaReactContext.Provider>
        </EuiThemeProvider>
      </IntlProvider>
    );
  });
  it('Should default to Type', () => {
    expect(screen.findByText('Group entities by: Type')).toBeTruthy();
  });
});
