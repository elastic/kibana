/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Observable } from 'rxjs';
import { AppMountParameters, DocLinksStart, HttpStart } from '@kbn/core/public';
import { mockApmPluginContextValue } from '../context/apm_plugin/mock_apm_plugin_context';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { renderApp as renderApmApp } from '.';
import { disableConsoleWarning } from '../utils/test_helpers';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';

jest.mock('../services/rest/data_view', () => ({
  createStaticDataView: () => Promise.resolve(undefined),
}));

describe('renderApp (APM)', () => {
  let mockConsole: jest.SpyInstance;
  beforeAll(() => {
    // The RUM agent logs an unnecessary message here. There's a couple open
    // issues need to be fixed to get the ability to turn off all of the logging:
    //
    // * https://github.com/elastic/apm-agent-rum-js/issues/799
    // * https://github.com/elastic/apm-agent-rum-js/issues/861
    //
    // for now, override `console.warn` to filter those messages out.
    mockConsole = disableConsoleWarning('[Elastic APM]');
  });

  afterAll(() => {
    mockConsole.mockRestore();
  });

  const getApmMountProps = () => {
    const {
      core: coreStart,
      config,
      observabilityRuleTypeRegistry,
      corePlugins,
    } = mockApmPluginContextValue;

    const pluginsSetup = {
      licensing: { license$: new Observable() },
      triggersActionsUi: { actionTypeRegistry: {}, ruleTypeRegistry: {} },
      data: {
        query: {
          timefilter: {
            timefilter: { setTime: () => {}, getTime: () => ({}) },
          },
        },
      },
    };
    const appMountParameters = {
      element: document.createElement('div'),
      history: createMemoryHistory(),
      setHeaderActionMenu: () => {},
      theme$: new Observable(),
    };

    const data = dataPluginMock.createStartContract();
    const embeddable = embeddablePluginMock.createStartContract();

    const pluginsStart = {
      data,
      embeddable,
      observability: {
        navigation: {
          registerSections: () => jest.fn(),
          PageTemplate: ({ children }: { children: React.ReactNode }) => (
            <div>hello worlds {children}</div>
          ),
        },
      },
      triggersActionsUi: {
        actionTypeRegistry: {},
        ruleTypeRegistry: {},
        getAddAlertFlyout: jest.fn(),
        getEditAlertFlyout: jest.fn(),
      },
      usageCollection: { reportUiCounter: () => {} },
      http: {
        basePath: {
          prepend: (path: string) => `/basepath${path}`,
          get: () => `/basepath`,
        },
      } as HttpStart,
      docLinks: {
        DOC_LINK_VERSION: '0',
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        links: {
          apm: {},
          observability: { guide: '' },
        },
      } as unknown as DocLinksStart,
    } as unknown as ApmPluginStartDeps;

    jest.spyOn(window, 'scrollTo').mockReturnValueOnce(undefined);
    createCallApmApi(coreStart);

    jest
      .spyOn(window.console, 'warn')
      .mockImplementationOnce((message: string) => {
        if (message.startsWith('[Elastic APM')) {
          return;
        } else {
          console.warn(message); // eslint-disable-line no-console
        }
      });

    return {
      coreStart,
      pluginsSetup: pluginsSetup as unknown as ApmPluginSetupDeps,
      appMountParameters: appMountParameters as unknown as AppMountParameters,
      pluginsStart,
      config,
      observabilityRuleTypeRegistry,
      corePlugins,
    };
  };

  it('renders the app', () => {
    const mountProps = getApmMountProps();

    let unmount: () => void;

    act(() => {
      unmount = renderApmApp(mountProps);
    });

    expect(() => {
      unmount();
    }).not.toThrowError();
  });
});
