/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { of } from 'rxjs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render as reactTestLibRender, RenderOptions } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
// eslint-disable-next-line import/no-extraneous-dependencies
import { configure } from '@testing-library/dom';
import { mockState } from '../__mocks__/uptime_store.mock';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import { IStorageWrapper } from '../../../../../../src/plugins/kibana_utils/public';
import {
  KibanaContextProvider,
  KibanaServices,
} from '../../../../../../src/plugins/kibana_react/public';
import { MountWithReduxProvider } from './helper_with_redux';
import { AppState } from '../../state';
import { stringifyUrlParams } from './stringify_url_params';
import { ClientPluginsStart } from '../../apps/plugin';
import { triggersActionsUiMock } from '../../../../triggers_actions_ui/public/mocks';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';
import { UptimeRefreshContextProvider, UptimeStartupPluginsContextProvider } from '../../contexts';

interface KibanaProps {
  services?: KibanaServices;
}

export interface KibanaProviderOptions<ExtraCore> {
  core?: Partial<CoreStart> & ExtraCore;
  kibanaProps?: KibanaProps;
}

interface MockKibanaProviderProps<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  children: ReactElement;
}

interface MockRouterProps<ExtraCore> extends MockKibanaProviderProps<ExtraCore> {
  history?: History;
}

type Url =
  | string
  | {
      path: string;
      queryParams: Record<string, string | number>;
    };

interface RenderRouterOptions<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  history?: History;
  renderOptions?: Omit<RenderOptions, 'queries'>;
  state?: Partial<AppState>;
  url?: Url;
}

function getSetting<T = any>(key: string): T {
  return 'MMM D, YYYY @ HH:mm:ss.SSS' as unknown as T;
}

function setSetting$<T = any>(key: string): T {
  return of('MMM D, YYYY @ HH:mm:ss.SSS') as unknown as T;
}

const createMockStore = () => {
  let store: Record<string, any> = {};
  return {
    get: jest.fn().mockImplementation((key) => store[key]),
    set: jest.fn().mockImplementation((key, value) => (store[key] = value)),
    remove: jest.fn().mockImplementation((key: string) => delete store[key]),
    clear: jest.fn().mockImplementation(() => (store = {})),
  };
};

const mockAppUrls: Record<string, string> = {
  uptime: '/app/uptime',
  observability: '/app/observability',
  '/integrations/detail/synthetics/overview': '/integrations/detail/synthetics/overview',
};

/* default mock core */
const defaultCore = coreMock.createStart();
const mockCore: () => Partial<CoreStart> = () => {
  const core: Partial<CoreStart & ClientPluginsStart & { storage: IStorageWrapper }> = {
    ...defaultCore,
    application: {
      ...defaultCore.application,
      getUrlForApp: (app: string) => mockAppUrls[app],
      navigateToUrl: jest.fn(),
      capabilities: {
        ...defaultCore.application.capabilities,
        uptime: {
          'alerting:save': true,
          configureSettings: true,
          save: true,
          show: true,
        },
      },
    },
    uiSettings: {
      ...defaultCore.uiSettings,
      get: getSetting,
      get$: setSetting$,
    },
    triggersActionsUi: triggersActionsUiMock.createStart(),
    storage: createMockStore(),
    data: dataPluginMock.createStartContract(),
  };

  return core;
};

/* Mock Provider Components */
export function MockKibanaProvider<ExtraCore>({
  children,
  core,
  kibanaProps,
}: MockKibanaProviderProps<ExtraCore>) {
  const coreOptions = {
    ...mockCore(),
    ...core,
  };
  return (
    <KibanaContextProvider services={{ ...coreOptions }} {...kibanaProps}>
      <UptimeRefreshContextProvider>
        <UptimeStartupPluginsContextProvider data={(coreOptions as any).data}>
          <EuiThemeProvider darkMode={false}>
            <I18nProvider>{children}</I18nProvider>
          </EuiThemeProvider>
        </UptimeStartupPluginsContextProvider>
      </UptimeRefreshContextProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter<ExtraCore>({
  children,
  core,
  history = createMemoryHistory(),
  kibanaProps,
}: MockRouterProps<ExtraCore>) {
  return (
    <Router history={history}>
      <MockKibanaProvider core={core} kibanaProps={kibanaProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}
configure({ testIdAttribute: 'data-test-subj' });

/* Custom react testing library render */
export function render<ExtraCore>(
  ui: ReactElement,
  {
    history = createMemoryHistory(),
    core,
    kibanaProps,
    renderOptions,
    state,
    url,
  }: RenderRouterOptions<ExtraCore> = {}
) {
  const testState: AppState = {
    ...mockState,
    ...state,
  };

  if (url) {
    history = getHistoryFromUrl(url);
  }

  return {
    ...reactTestLibRender(
      <MountWithReduxProvider state={testState}>
        <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
          {ui}
        </MockRouter>
      </MountWithReduxProvider>,
      renderOptions
    ),
    history,
  };
}

const getHistoryFromUrl = (url: Url) => {
  if (typeof url === 'string') {
    return createMemoryHistory({
      initialEntries: [url],
    });
  }

  return createMemoryHistory({
    initialEntries: [url.path + stringifyUrlParams(url.queryParams)],
  });
};
