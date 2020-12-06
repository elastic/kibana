/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createMemoryHistory } from 'history';
import React from 'react';
import { Observable } from 'rxjs';
import { AppMountParameters, CoreStart } from 'src/core/public';
import { ObservabilityPluginSetupDeps } from '../plugin';
import { renderApp } from './';

describe('renderApp', () => {
  const originalConsole = global.console;
  beforeAll(() => {
    // mocks console to avoid poluting the test output
    global.console = ({ error: jest.fn() } as unknown) as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });
  it('renders', async () => {
    const plugins = ({
      usageCollection: { reportUiCounter: () => {} },
      data: {
        query: {
          timefilter: {
            timefilter: { setTime: jest.fn(), getTime: jest.fn().mockImplementation(() => ({})) },
          },
        },
      },
    } as unknown) as ObservabilityPluginSetupDeps;
    const core = ({
      application: { currentAppId$: new Observable(), navigateToUrl: () => {} },
      chrome: {
        docTitle: { change: () => {} },
        setBreadcrumbs: () => {},
        setHelpExtension: () => {},
      },
      i18n: { Context: ({ children }: { children: React.ReactNode }) => children },
      uiSettings: { get: () => false },
      http: { basePath: { prepend: (path: string) => path } },
    } as unknown) as CoreStart;
    const params = ({
      element: window.document.createElement('div'),
      history: createMemoryHistory(),
      setHeaderActionMenu: () => {},
    } as unknown) as AppMountParameters;

    expect(() => {
      const unmount = renderApp(core, plugins, params);
      unmount();
    }).not.toThrowError();
  });
});
