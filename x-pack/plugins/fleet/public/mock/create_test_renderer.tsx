/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as reactRender, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import type { RenderHookResult } from '@testing-library/react-hooks';

import { themeServiceMock } from '@kbn/core/public/mocks';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ScopedHistory } from '@kbn/core/public';

import { FleetAppContext } from '../applications/fleet/app';
import { IntegrationsAppContext } from '../applications/integrations/app';
import type { FleetConfigType } from '../plugin';
import type { UIExtensionsStorage } from '../types';

import { createConfigurationMock } from './plugin_configuration';
import { createStartMock } from './plugin_interfaces';
import { createStartServices } from './fleet_start_services';
import type { MockedFleetStart, MockedFleetStartServices } from './types';
type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Test Renderer that includes mocked services and interfaces used during Fleet applicaiton rendering.
 * Any of the properties in this interface can be manipulated prior to `render()` if wanting to customize
 * the rendering context.
 */
export interface TestRenderer {
  /** History instance currently used by the Fleet UI Hash Router */
  history: History<any>;
  /** history instance provided to the Fleet plugin during application `mount()` */
  mountHistory: ScopedHistory;
  startServices: MockedFleetStartServices;
  config: FleetConfigType;
  /** The Interface returned by the Fleet plugin `start()` phase */
  startInterface: MockedFleetStart;
  kibanaVersion: string;
  AppWrapper: React.FC<any>;
  HookWrapper: React.FC<any>;
  render: UiRender;
  renderHook: <TProps, TResult>(
    callback: (props: TProps) => TResult
  ) => RenderHookResult<TProps, TResult>;
  setHeaderActionMenu: Function;
}

export const createFleetTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const extensions: UIExtensionsStorage = {};
  const startServices = createStartServices(basePath);
  const history = createMemoryHistory({ initialEntries: [basePath] });

  const HookWrapper = memo(({ children }) => {
    return (
      <startServices.i18n.Context>
        <KibanaContextProvider services={{ ...startServices }}>{children}</KibanaContextProvider>
      </startServices.i18n.Context>
    );
  });

  const testRendererMocks: TestRenderer = {
    history,
    mountHistory: new ScopedHistory(history, basePath),
    startServices,
    config: createConfigurationMock(),
    startInterface: createStartMock(extensions),
    kibanaVersion: '8.0.0',
    setHeaderActionMenu: jest.fn(),
    AppWrapper: memo(({ children }) => {
      return (
        <FleetAppContext
          startServices={testRendererMocks.startServices}
          config={testRendererMocks.config}
          history={testRendererMocks.mountHistory}
          kibanaVersion={testRendererMocks.kibanaVersion}
          extensions={extensions}
          routerHistory={testRendererMocks.history}
          theme$={themeServiceMock.createTheme$()}
        >
          {children}
        </FleetAppContext>
      );
    }),
    HookWrapper,
    renderHook: (callback) => {
      return renderHook(callback, {
        wrapper: testRendererMocks.HookWrapper,
      });
    },
    render: (ui, options) => {
      let renderResponse: RenderResult;
      act(() => {
        renderResponse = reactRender(ui, {
          wrapper: testRendererMocks.AppWrapper,
          ...options,
        });
      });
      return renderResponse!;
    },
  };

  return testRendererMocks;
};

export const createIntegrationsTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const extensions: UIExtensionsStorage = {};
  const startServices = createStartServices(basePath);
  const HookWrapper = memo(({ children }) => {
    return (
      <startServices.i18n.Context>
        <KibanaContextProvider services={{ ...startServices }}>{children}</KibanaContextProvider>
      </startServices.i18n.Context>
    );
  });
  const testRendererMocks: TestRenderer = {
    history: createMemoryHistory(),
    mountHistory: new ScopedHistory(createMemoryHistory({ initialEntries: [basePath] }), basePath),
    startServices,
    config: createConfigurationMock(),
    startInterface: createStartMock(extensions),
    kibanaVersion: '8.0.0',
    setHeaderActionMenu: jest.fn(),
    AppWrapper: memo(({ children }) => {
      return (
        <IntegrationsAppContext
          basepath={basePath}
          startServices={testRendererMocks.startServices}
          config={testRendererMocks.config}
          history={testRendererMocks.mountHistory}
          kibanaVersion={testRendererMocks.kibanaVersion}
          extensions={extensions}
          routerHistory={testRendererMocks.history}
          theme$={themeServiceMock.createTheme$()}
          setHeaderActionMenu={() => {}}
        >
          {children}
        </IntegrationsAppContext>
      );
    }),
    HookWrapper,
    render: (ui, options) => {
      let renderResponse: RenderResult;
      act(() => {
        renderResponse = reactRender(ui, {
          wrapper: testRendererMocks.AppWrapper,
          ...options,
        });
      });
      return renderResponse!;
    },
    renderHook: (callback) => {
      return renderHook(callback, {
        wrapper: testRendererMocks.HookWrapper,
      });
    },
  };

  return testRendererMocks;
};
