/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import React, { ReactElement } from 'react';
import { stringify } from 'query-string';
import { render as reactTestLibRender, RenderOptions } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
import { configure } from '@testing-library/dom';
import {
  KibanaServices,
  KibanaContextProvider,
} from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { lensPluginMock } from '../../../../../lens/public/mocks';
import { IndexPatternContextProvider } from './hooks/use_default_index_pattern';
import { UrlStorageContextProvider } from './hooks/use_url_strorage';
import {
  withNotifyOnErrors,
  createKbnUrlStateStorage,
} from '../../../../../../../src/plugins/kibana_utils/public';

interface KibanaProps {
  services?: KibanaServices;
}

export interface KibanaProviderOptions<ExtraCore> {
  core?: Partial<CoreStart> & ExtraCore;
  kibanaProps?: KibanaProps;
}

interface MockKibanaProviderProps<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  children: ReactElement;
  history: History;
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
  url?: Url;
}

function getSetting<T = any>(key: string): T {
  return ('MMM D, YYYY @ HH:mm:ss.SSS' as unknown) as T;
}

function setSetting$<T = any>(key: string): T {
  return (of('MMM D, YYYY @ HH:mm:ss.SSS') as unknown) as T;
}

/* default mock core */
const defaultCore = coreMock.createStart();
const mockCore: () => Partial<CoreStart> = () => {
  const core: Partial<CoreStart & ObservabilityPublicPluginsStart> = {
    ...defaultCore,
    application: {
      ...defaultCore.application,
      getUrlForApp: () => '/app/uptime',
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
    lens: lensPluginMock.createStartContract(),
  };

  return core;
};

/* Mock Provider Components */
export function MockKibanaProvider<ExtraCore>({
  children,
  core,
  history,
  kibanaProps,
}: MockKibanaProviderProps<ExtraCore>) {
  const coreOptions = {
    ...mockCore(),
    ...core,
  };

  const { uiSettings, notifications } = coreOptions;

  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: uiSettings!.get('state:storeInSessionStorage'),
    ...withNotifyOnErrors(notifications!.toasts),
  });

  return (
    <KibanaContextProvider services={{ ...coreOptions }} {...kibanaProps}>
      <EuiThemeProvider darkMode={false}>
        <I18nProvider>
          <IndexPatternContextProvider indexPattern={{}}>
            <UrlStorageContextProvider storage={kbnUrlStateStorage}>
              {children}
            </UrlStorageContextProvider>
          </IndexPatternContextProvider>
        </I18nProvider>
      </EuiThemeProvider>
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
      <MockKibanaProvider core={core} kibanaProps={kibanaProps} history={history}>
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
    url,
  }: RenderRouterOptions<ExtraCore> = {}
) {
  if (url) {
    history = getHistoryFromUrl(url);
  }

  return {
    ...reactTestLibRender(
      <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
        {ui}
      </MockRouter>,
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
    initialEntries: [url.path + stringify(url.queryParams)],
  });
};
