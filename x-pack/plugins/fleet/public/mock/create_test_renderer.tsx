/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import type { History } from 'history';
import { createMemoryHistory } from 'history';
import React, { memo } from 'react';
import type {
  RenderOptions,
  RenderResult,
  RenderHookOptions,
  RenderHookResult,
} from '@testing-library/react';
import {
  render as reactRender,
  act,
  renderHook as reactRenderHook,
  waitFor,
} from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
import { CoreScopedHistory } from '@kbn/core/public';

import { allowedExperimentalValues } from '../../common/experimental_features';

import { FleetAppContext } from '../applications/fleet/app';
import { IntegrationsAppContext } from '../applications/integrations/app';
import type { FleetConfigType } from '../plugin';
import type { UIExtensionsStorage } from '../types';
import { ExperimentalFeaturesService } from '../services';

import { createConfigurationMock } from './plugin_configuration';
import { createStartMock } from './plugin_interfaces';
import { createStartServices } from './fleet_start_services';
import type { MockedFleetStart, MockedFleetStartServices } from './types';

type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Test Renderer that includes mocked services and interfaces used during Fleet application rendering.
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
    callback: (props: TProps) => TResult,
    wrapper?: RenderHookOptions<any>['wrapper']
  ) => RenderHookResult<TResult, TProps>;
  setHeaderActionMenu: Function;
  waitFor: typeof waitFor;
}

const queryClient = new QueryClient();

export const createFleetTestRendererMock = (): TestRenderer => {
  const basePath = '/mock';
  const extensions: UIExtensionsStorage = {};
  const startServices = createStartServices(basePath);
  const history = createMemoryHistory({ initialEntries: [basePath] });
  const mountHistory = new CoreScopedHistory(history, basePath);

  ExperimentalFeaturesService.init(allowedExperimentalValues);

  const HookWrapper = memo(({ children }: { children?: React.ReactNode }) => {
    return (
      <startServices.i18n.Context>
        <Router history={mountHistory}>
          <QueryClientProvider client={queryClient}>
            <KibanaContextProvider services={{ ...startServices }}>
              {children}
            </KibanaContextProvider>
          </QueryClientProvider>
        </Router>
      </startServices.i18n.Context>
    );
  });

  const testRendererMocks: TestRenderer = {
    history,
    mountHistory,
    startServices,
    config: createConfigurationMock(),
    startInterface: createStartMock(extensions),
    kibanaVersion: '8.0.0',
    setHeaderActionMenu: jest.fn(),
    AppWrapper: memo(({ children }: { children?: React.ReactNode }) => {
      return (
        <FleetAppContext
          startServices={testRendererMocks.startServices}
          config={testRendererMocks.config}
          history={testRendererMocks.mountHistory}
          kibanaVersion={testRendererMocks.kibanaVersion}
          extensions={extensions}
          routerHistory={testRendererMocks.history}
          fleetStatus={{
            enabled: true,
            isLoading: false,
            isReady: true,
          }}
        >
          {children}
        </FleetAppContext>
      );
    }),
    HookWrapper,
    renderHook: (
      callback,
      ExtraWrapper = memo(({ children }: PropsWithChildren) => <>{children}</>)
    ) => {
      const wrapper = ({ children }: PropsWithChildren) => (
        <testRendererMocks.HookWrapper>
          <ExtraWrapper>{children}</ExtraWrapper>
        </testRendererMocks.HookWrapper>
      );

      return reactRenderHook(callback, {
        wrapper,
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
  ExperimentalFeaturesService.init(allowedExperimentalValues);
  const startServices = createStartServices(basePath);
  const HookWrapper = memo(({ children }: { children?: React.ReactNode }) => {
    return (
      <startServices.i18n.Context>
        <KibanaContextProvider services={{ ...startServices }}>{children}</KibanaContextProvider>
      </startServices.i18n.Context>
    );
  });
  const testRendererMocks: TestRenderer = {
    history: createMemoryHistory(),
    mountHistory: new CoreScopedHistory(
      createMemoryHistory({ initialEntries: [basePath] }),
      basePath
    ),
    startServices,
    config: createConfigurationMock(),
    startInterface: createStartMock(extensions),
    kibanaVersion: '8.0.0',
    setHeaderActionMenu: jest.fn(),
    AppWrapper: memo(({ children }: { children?: React.ReactNode }) => {
      return (
        <IntegrationsAppContext
          basepath={basePath}
          startServices={testRendererMocks.startServices}
          config={testRendererMocks.config}
          history={testRendererMocks.mountHistory}
          kibanaVersion={testRendererMocks.kibanaVersion}
          extensions={extensions}
          routerHistory={testRendererMocks.history}
          setHeaderActionMenu={() => {}}
          fleetStatus={{
            enabled: true,
            isLoading: false,
            isReady: true,
          }}
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
    renderHook: (
      callback,
      ExtraWrapper = memo(({ children }: PropsWithChildren) => <>{children}</>)
    ) => {
      const wrapper = ({ children }: PropsWithChildren) => (
        <testRendererMocks.HookWrapper>
          <ExtraWrapper>{children}</ExtraWrapper>
        </testRendererMocks.HookWrapper>
      );
      return reactRenderHook(callback, {
        wrapper,
      });
    },
    waitFor,
  };

  return testRendererMocks;
};
