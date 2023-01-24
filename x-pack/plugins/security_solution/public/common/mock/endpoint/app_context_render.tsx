/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactPortal } from 'react';
import React from 'react';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { render as reactRender } from '@testing-library/react';
import type { Action, Reducer, Store } from 'redux';
import type { AppDeepLink } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import type { RenderHookOptions, RenderHookResult } from '@testing-library/react-hooks';
import { renderHook as reactRenderHoook } from '@testing-library/react-hooks';
import type {
  ReactHooksRenderer,
  WrapperComponent,
} from '@testing-library/react-hooks/src/types/react';
import type { UseBaseQueryResult } from '@tanstack/react-query';
import ReactDOM from 'react-dom';
import { ConsoleManager } from '../../../management/components/console';
import type { StartPlugins, StartServices } from '../../../types';
import { depsStartMock } from './dependencies_start_mock';
import type { MiddlewareActionSpyHelper } from '../../store/test_utils';
import { createSpyMiddleware } from '../../store/test_utils';
import { kibanaObservable } from '../test_providers';
import type { State } from '../../store';
import { createStore } from '../../store';
import { AppRootProvider } from './app_root_provider';
import { managementMiddlewareFactory } from '../../../management/store/middleware';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { SUB_PLUGINS_REDUCER, mockGlobalState, createSecuritySolutionStorageMock } from '..';
import type { ExperimentalFeatures } from '../../../../common/experimental_features';
import { APP_UI_ID, APP_PATH } from '../../../../common/constants';
import { KibanaContextProvider, KibanaServices } from '../../lib/kibana';
import { getDeepLinks } from '../../../app/deep_links';
import { fleetGetPackageHttpMock } from '../../../management/mocks';

const REAL_REACT_DOM_CREATE_PORTAL = ReactDOM.createPortal;

/**
 * Resets the mock that is applied to `createPortal()` by default.
 * **IMPORTANT** : Make sure you call this function from a `before*()` or `after*()` callback
 *
 * @example
 *
 * // Turn off for test using Enzyme
 * beforeAll(() => resetReactDomCreatePortalMock());
 */
export const resetReactDomCreatePortalMock = () => {
  ReactDOM.createPortal = REAL_REACT_DOM_CREATE_PORTAL;
};

beforeAll(() => {
  // Mocks the React DOM module to ensure compatibility with react-testing-library and avoid
  // error like:
  // ```
  // TypeError: parentInstance.children.indexOf is not a function
  //       at appendChild (node_modules/react-test-renderer/cjs/react-test-renderer.development.js:7183:39)
  // ```
  // @see https://github.com/facebook/react/issues/11565
  ReactDOM.createPortal = jest.fn((...args) => {
    REAL_REACT_DOM_CREATE_PORTAL(...args);
    // Needed for react-Test-library. See:
    // https://github.com/facebook/react/issues/11565
    return args[0] as ReactPortal;
  });
});

afterAll(() => {
  resetReactDomCreatePortalMock();
});

export type UiRender = (ui: React.ReactElement, options?: RenderOptions) => RenderResult;

/**
 * Have the renderer wait for one of the ReactQuery state flag properties. Default is `isSuccess`.
 * To disable this `await`, the value `false` can be used.
 */
export type WaitForReactHookState =
  | keyof Pick<
      UseBaseQueryResult,
      | 'isSuccess'
      | 'isLoading'
      | 'isError'
      | 'isLoadingError'
      | 'isStale'
      | 'isFetched'
      | 'isFetching'
      | 'isRefetching'
    >
  | false;

type HookRendererFunction<TProps, TResult> = (props: TProps) => TResult;

/**
 * A utility renderer for hooks that return React Query results
 */
export type ReactQueryHookRenderer<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TProps = any,
  TResult extends UseBaseQueryResult = UseBaseQueryResult
> = (
  hookFn: HookRendererFunction<TProps, TResult>,
  /**
   * If defined (default is `isSuccess`), the renderer will wait for the given react
   * query response state value to be true
   */
  waitForHook?: WaitForReactHookState,
  options?: RenderHookOptions<TProps>
) => Promise<TResult>;

/**
 * Mocked app root context renderer
 */
export interface AppContextTestRender {
  store: Store<State>;
  history: ReturnType<typeof createMemoryHistory>;
  coreStart: ReturnType<typeof coreMock.createStart>;
  depsStart: Pick<StartPlugins, 'data' | 'fleet' | 'unifiedSearch'>;
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
   * Renders a hook within a mocked security solution app context
   */
  renderHook: ReactHooksRenderer['renderHook'];

  /**
   * A helper utility for rendering specifically hooks that wrap ReactQuery
   */
  renderReactQueryHook: ReactQueryHookRenderer;

  /**
   * Set technical preview features on/off. Calling this method updates the Store with the new values
   * for the given feature flags
   * @param flags
   */
  setExperimentalFlag: (flags: Partial<ExperimentalFeatures>) => void;

  /**
   * The React Query client (setup to support jest testing)
   */
  queryClient: QueryClient;
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
    // hide react-query output in console
    logger: {
      error: () => {},
      // eslint-disable-next-line no-console
      log: console.log,
      // eslint-disable-next-line no-console
      warn: console.warn,
    },
  });

  const AppWrapper: React.FC<{ children: React.ReactElement }> = ({ children }) => (
    <KibanaContextProvider services={startServices}>
      <AppRootProvider store={store} history={history} coreStart={coreStart} depsStart={depsStart}>
        <QueryClientProvider client={queryClient}>
          <ConsoleManager>{children}</ConsoleManager>
        </QueryClientProvider>
      </AppRootProvider>
    </KibanaContextProvider>
  );

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: AppWrapper,
      ...options,
    });
  };

  const renderHook: ReactHooksRenderer['renderHook'] = <TProps, TResult>(
    hookFn: HookRendererFunction<TProps, TResult>,
    options: RenderHookOptions<TProps> = {}
  ): RenderHookResult<TProps, TResult> => {
    return reactRenderHoook<TProps, TResult>(hookFn, {
      wrapper: AppWrapper as WrapperComponent<TProps>,
      ...options,
    });
  };

  const renderReactQueryHook: ReactQueryHookRenderer = async <
    TProps,
    TResult extends UseBaseQueryResult = UseBaseQueryResult
  >(
    hookFn: HookRendererFunction<TProps, TResult>,
    waitForHook: WaitForReactHookState = 'isSuccess',
    options: RenderHookOptions<TProps> = {}
  ) => {
    const { result: hookResult, waitFor } = renderHook<TProps, TResult>(hookFn, options);

    if (waitForHook) {
      await waitFor(() => {
        return hookResult.current[waitForHook];
      });
    }

    return hookResult.current;
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
    kibanaBranch: 'main',
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
    renderHook,
    renderReactQueryHook,
    setExperimentalFlag,
    queryClient,
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
  fleetGetPackageHttpMock(http, { ignoreUnMockedApiRouteErrors: true });
};
