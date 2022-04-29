/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory } from 'history';
import { noop } from 'lodash';
import React from 'react';
import { Observable } from 'rxjs';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { KibanaPageTemplate } from '@kbn/kibana-react-plugin/public';
import { ObservabilityPublicPluginsStart } from '../plugin';
import { createObservabilityRuleTypeRegistryMock } from '../rules/observability_rule_type_registry_mock';
import { renderApp } from '.';

describe('renderApp', () => {
  const originalConsole = global.console;

  beforeAll(() => {
    // mocks console to avoid polluting the test output
    global.console = { error: jest.fn() } as unknown as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  it('renders', async () => {
    const plugins = {
      usageCollection: { reportUiCounter: noop },
      data: {
        query: {
          timefilter: {
            timefilter: {
              setTime: jest.fn(),
              getTime: jest.fn().mockReturnValue({}),
              getTimeDefaults: jest.fn().mockReturnValue({}),
              getRefreshInterval: jest.fn().mockReturnValue({}),
              getRefreshIntervalDefaults: jest.fn().mockReturnValue({}),
            },
          },
        },
      },
    } as unknown as ObservabilityPublicPluginsStart;

    const core = {
      application: { currentAppId$: new Observable(), navigateToUrl: noop },
      chrome: {
        docTitle: { change: noop },
        setBreadcrumbs: noop,
        setHelpExtension: noop,
      },
      i18n: { Context: ({ children }: { children: React.ReactNode }) => children },
      uiSettings: { get: () => false },
      http: { basePath: { prepend: (path: string) => path } },
      theme: themeServiceMock.createStartContract(),
    } as unknown as CoreStart;

    const config = {
      unsafe: {
        alertingExperience: { enabled: true },
        cases: { enabled: true },
        rules: { enabled: true },
      },
    };

    const params = {
      element: window.document.createElement('div'),
      history: createMemoryHistory(),
      setHeaderActionMenu: noop,
      theme$: themeServiceMock.createTheme$(),
    } as unknown as AppMountParameters;

    expect(() => {
      const unmount = renderApp({
        config,
        core,
        plugins,
        appMountParameters: params,
        observabilityRuleTypeRegistry: createObservabilityRuleTypeRegistryMock(),
        ObservabilityPageTemplate: KibanaPageTemplate,
        kibanaFeatures: [],
      });
      unmount();
    }).not.toThrowError();
  });
});
