/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Observable } from 'rxjs';
import { AppMountParameters, CoreStart, HttpSetup } from 'src/core/public';
import { mockApmPluginContextValue } from '../context/apm_plugin/mock_apm_plugin_context';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { renderApp } from './';
import { disableConsoleWarning } from '../utils/testHelpers';
import { dataPluginMock } from 'src/plugins/data/public/mocks';
import { embeddablePluginMock } from 'src/plugins/embeddable/public/mocks';

jest.mock('../services/rest/index_pattern', () => ({
  createStaticIndexPattern: () => Promise.resolve(undefined),
}));

describe('renderApp', () => {
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

  it('renders the app', () => {
    const { core, config } = mockApmPluginContextValue;
    const plugins = {
      licensing: { license$: new Observable() },
      triggersActionsUi: { actionTypeRegistry: {}, alertTypeRegistry: {} },
      usageCollection: { reportUiCounter: () => {} },
      data: {
        query: {
          timefilter: {
            timefilter: { setTime: () => {}, getTime: () => ({}) },
          },
        },
      },
    };
    const params = {
      element: document.createElement('div'),
      history: createMemoryHistory(),
      setHeaderActionMenu: () => {},
    };

    const data = dataPluginMock.createStartContract();
    const embeddable = embeddablePluginMock.createStartContract();
    const startDeps = {
      triggersActionsUi: {
        actionTypeRegistry: {},
        alertTypeRegistry: {},
        getAddAlertFlyout: jest.fn(),
        getEditAlertFlyout: jest.fn(),
      },
      data,
      embeddable,
    };
    jest.spyOn(window, 'scrollTo').mockReturnValueOnce(undefined);
    createCallApmApi((core.http as unknown) as HttpSetup);

    jest
      .spyOn(window.console, 'warn')
      .mockImplementationOnce((message: string) => {
        if (message.startsWith('[Elastic APM')) {
          return;
        } else {
          console.warn(message); // eslint-disable-line no-console
        }
      });

    let unmount: () => void;

    act(() => {
      unmount = renderApp(
        (core as unknown) as CoreStart,
        (plugins as unknown) as ApmPluginSetupDeps,
        (params as unknown) as AppMountParameters,
        config,
        (startDeps as unknown) as ApmPluginStartDeps
      );
    });

    expect(() => {
      unmount();
    }).not.toThrowError();
  });
});
