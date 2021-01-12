/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { render as reactTestLibRender, RenderOptions } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n/react';
import { coreMock } from 'src/core/public/mocks';
import { mockState } from '../__mocks__/uptime_store.mock';
import {
  KibanaContextProvider,
  KibanaServices,
} from '../../../../../../src/plugins/kibana_react/public';
import { MountWithReduxProvider } from './helper_with_redux';
import { AppState } from '../../state';

interface KibanaProps {
  services?: KibanaServices;
}

interface KibanaProviderOptions<ExtraCore> {
  core?: Partial<CoreStart> & ExtraCore;
  kibanaProps?: KibanaProps;
}

interface MockKibanaProviderProps<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  children: ReactElement;
}

interface MockRouterProps<ExtraCore> extends MockKibanaProviderProps<ExtraCore> {
  history?: History;
}

interface RenderRouterOptions<ExtraCore> extends KibanaProviderOptions<ExtraCore> {
  history?: History;
  renderOptions?: Omit<RenderOptions, 'queries'>;
  state?: Partial<AppState>;
}

/* default mock core */
const defaultCore = coreMock.createStart();
const mockCore: () => any = () => {
  const core = {
    ...defaultCore,
    application: {
      getUrlForApp: () => '/app/uptime',
      navigateToUrl: jest.fn(),
    },
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
      <I18nProvider>{children}</I18nProvider>
    </KibanaContextProvider>
  );
}

export function MockRouter<ExtraCore>({
  children,
  core,
  history: customHistory,
  kibanaProps,
}: MockRouterProps<ExtraCore>) {
  const history = customHistory || createMemoryHistory();
  return (
    <Router history={history}>
      <MockKibanaProvider core={core} kibanaProps={kibanaProps}>
        {children}
      </MockKibanaProvider>
    </Router>
  );
}

/* Custom react testing library render */
export function render<ExtraCore>(
  ui: ReactElement,
  { history, core, kibanaProps, renderOptions, state }: RenderRouterOptions<ExtraCore> = {}
) {
  const testState: AppState = {
    ...mockState,
    ...state,
  };
  return reactTestLibRender(
    <MountWithReduxProvider state={testState}>
      <MockRouter history={history} kibanaProps={kibanaProps} core={core}>
        {ui}
      </MockRouter>
    </MountWithReduxProvider>,
    renderOptions
  );
}
