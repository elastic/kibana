/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import React, { useMemo } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Switch, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fleetMock } from '@kbn/fleet-plugin/public/mocks';
import type { CloudDefendPluginStartDeps } from '../types';
import './__mocks__/worker';
import './__mocks__/resizeobserver';
import '@kbn/kibana-react-plugin/public/code_editor/code_editor.test.helpers';

// @ts-ignore-next
window.Worker = Worker;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

interface CspAppDeps {
  core: CoreStart;
  deps: CloudDefendPluginStartDeps;
  params: AppMountParameters;
}

export const TestProvider: React.FC<Partial<CspAppDeps>> = ({
  core = coreMock.createStart(),
  deps = {
    data: dataPluginMock.createStartContract(),
    fleet: fleetMock.createStartMock(),
  },
  params = coreMock.createAppMountParameters(),
  children,
} = {}) => {
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <KibanaContextProvider services={{ ...core, ...deps }}>
      <QueryClientProvider client={queryClient}>
        <Router history={params.history}>
          <I18nProvider>
            <Switch>
              <Route path="*" render={() => <>{children}</>} />
            </Switch>
          </I18nProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
