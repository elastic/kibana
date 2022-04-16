/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMemoryHistory, MemoryHistory } from 'history';
import { render as reactRender, RenderOptions, RenderResult } from '@testing-library/react';
import { Action, Reducer, Store } from 'redux';
import { AppDeepLink } from '@kbn/core/public';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { StartPlugins, StartServices } from '../../../types';
import { depsStartMock } from './dependencies_start_mock';
import { MiddlewareActionSpyHelper, createSpyMiddleware } from '../../store/test_utils';
import { kibanaObservable } from '../test_providers';
import { createStore, State } from '../../store';
import { AppRootProvider } from './app_root_provider';
import { managementMiddlewareFactory } from '../../../management/store/middleware';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { SUB_PLUGINS_REDUCER, mockGlobalState, createSecuritySolutionStorageMock } from '..';
import { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID, APP_PATH } from '../../../../common/constants';
import { KibanaContextProvider, KibanaServices } from '../../lib/kibana';
import { getDeepLinks } from '../../../app/deep_links';
import { fleetGetPackageListHttpMock } from '../../../management/pages/mocks';

export type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

// hide react-query output in console
setLogger({
  error: () => {},
  // eslint-disable-next-line no-console
  log: console.log,
  // eslint-disable-next-line no-console
  warn: console.warn,
});

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender {
  store: Store<State>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  startServices: StartServices;
  middlewareSpy: MiddlewareActionSpyHelper;
  /**
   * A wrapper around `AppRootContext` component. Uses the mocked modules as input to the
   * `AppRootContext`
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AppWrapper: React.FC<any>;
  /**
   * Renders the given UI within the created `AppWrapper` providing the given UI a mocked
   * endpoint runtime context environment
   */
  render: UiRender;

  /**
   * Set technical preview features on/off. Calling this method updates the Store with the new values
   * for the given feature flags
   * @param flags
   */
  setExperimentalFlag: (flags: Partial<ExperimentalFeatures>) => void;
}

// Defined a private custom reducer that reacts to an action that enables us to update the
// store with new values for technical preview features/flags. Because the `action.type` is a `Symbol`,
// and its not exported the action can only be `dispatch`'d from this module
const UpdateExperimentalFeaturesTestActionType = Symbol('updateExperimentalFeaturesTestAction');

type UpdateExperimentalFeaturesTestAction = Action<
  typeof UpdateExperimentalFeaturesTestActionType
> & {
  payload: Partial<ExperimentalFeatures>;
};

const experimentalFeaturesReducer: Reducer<State['app'], UpdateExperimentalFeaturesTestAction> = (
  state = mockGlobalState.app,
  action
) => {
  if (action.type === UpdateExperimentalFeaturesTestActionType) {
    return {
      ...state,
      enableExperimental: {
        ...state.enableExperimental,
        ...action.payload,
      },
    };
  }
  return state;
};

/**
 * Creates a mocked endpoint app context custom renderer that can be used to render
 * component that depend upon the application's surrounding context providers.
 * Factory also returns the content that was used to create the custom renderer, allowing
 * for further customization.
 */
export const createAppRootMockRenderer = (): AppContextTestRender => {
  const history = createMemoryHistory<never>();
  const coreStart = createCoreStartMock(history);
  const depsStart = depsStartMock();
  const middlewareSpy = createSpyMiddleware();
  const { storage } = createSecuritySolutionStorageMock();
  const startServices: StartServices = createStartServicesMock(coreStart);

  const storeReducer = {
    ...SUB_PLUGINS_REDUCER,
    // This is ok here because the store created by this testing utility (see below) does
    // not pull in the non-sub-plugin reducers
    app: experimentalFeaturesReducer,
  };

  const store = createStore(mockGlobalState, storeReducer, kibanaObservable, storage, [
    ...managementMiddlewareFactory(coreStart, depsStart),
    middlewareSpy.actionSpyMiddleware,
  ]);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // turns retries off
        retry: false,
        // prevent jest did not exit errors
        cacheTime: Infinity,
      },
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <KibanaContextProvider services={startServices}>
      <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AppRootProvider>
    </KibanaContextProvider>
  );

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };

  const setExperimentalFlag: AppContextTestRender['setExperimentalFlag'] = (flags) => {
    store.dispatch({
      type: UpdateExperimentalFeaturesTestActionType,
      payload: flags,
    });
  };

  // Initialize the singleton `KibanaServices` with global services created for this test instance.
  // The module (`../../lib/kibana`) could have been mocked at the test level via `jest.mock()`,
  // and if so, then we set the return value of `KibanaServices.get` instead of calling `KibanaServices.init()`
  const globalKibanaServicesParams = {
    ...startServices,
    kibanaVersion: '8.0.0',
  };

  if (jest.isMockFunction(KibanaServices.get)) {
    (KibanaServices.get as jest.Mock).mockReturnValue(globalKibanaServicesParams);
  } else {
    KibanaServices.init(globalKibanaServicesParams);
  }

  // Some APIs need to be mocked right from the start because they are called as soon as the store is initialized
  applyDefaultCoreHttpMocks(coreStart.http);

  return {
    store,
    history,
    coreStart,
    depsStart,
    startServices,
    middlewareSpy,
    AppWrapper,
    render,
    setExperimentalFlag,
  };
};

const createCoreStartMock = (
  history: MemoryHistory<never>
): ReturnType<typeof coreMock.createStart> => {
  const coreStart = coreMock.createStart({ basePath: '/mock' });

  const deepLinkPaths = getDeepLinkPaths(getDeepLinks(mockGlobalState.app.enableExperimental));

  // Mock the certain APP Ids returned by `application.getUrlForApp()`
  coreStart.application.getUrlForApp.mockImplementation((appId, { deepLinkId, path } = {}) => {
    switch (appId) {
      case PLUGIN_ID:
        return '/app/fleet';
      case APP_UI_ID:
        return `${APP_PATH}${
          deepLinkId && deepLinkPaths[deepLinkId] ? deepLinkPaths[deepLinkId] : ''
        }${path ?? ''}`;
      default:
        return `${appId} not mocked!`;
    }
  });

  coreStart.application.navigateToApp.mockImplementation((appId, { deepLinkId, path } = {}) => {
    if (appId === APP_UI_ID) {
      history.push(
        `${deepLinkId && deepLinkPaths[deepLinkId] ? deepLinkPaths[deepLinkId] : ''}${path ?? ''}`
      );
    }
    return Promise.resolve();
  });

  coreStart.application.navigateToUrl.mockImplementation((url) => {
    history.push(url.replace(APP_PATH, ''));
    return Promise.resolve();
  });

  return coreStart;
};

const getDeepLinkPaths = (deepLinks: AppDeepLink[]): Record<string, string> => {
  return deepLinks.reduce((result: Record<string, string>, deepLink) => {
    if (deepLink.path) {
      result[deepLink.id] = deepLink.path;
    }
    if (deepLink.deepLinks) {
      return { ...result, ...getDeepLinkPaths(deepLink.deepLinks) };
    }
    return result;
  }, {});
};

const applyDefaultCoreHttpMocks = (http: AppContextTestRender['coreStart']['http']) => {
  // Need to mock getting the endpoint package from the fleet API because it is used as soon
  // as the store middleware for Endpoint list is initialized, thus mocking it here would avoid
  // unnecessary errors being output to the console
  fleetGetPackageListHttpMock(http, { ignoreUnMockedApiRouteErrors: true });
};
