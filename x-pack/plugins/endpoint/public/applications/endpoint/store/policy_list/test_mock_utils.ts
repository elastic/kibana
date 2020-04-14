/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { Dispatch } from 'redux';
import { INGEST_API_DATASOURCES } from './services/ingest';
import { EndpointDocGenerator } from '../../../../../common/generate_data';
import { AppAction, GetDatasourcesResponse, GlobalState, MiddlewareFactory } from '../../types';

const generator = new EndpointDocGenerator('policy-list');

/**
 * It sets the mock implementation on the necessary http methods to support the policy list view
 * @param mockedHttpService
 * @param responseItems
 */
export const setPolicyListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  responseItems: GetDatasourcesResponse['items'] = [generator.generatePolicyDatasource()]
): void => {
  mockedHttpService.get.mockImplementation((...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (path === INGEST_API_DATASOURCES) {
        return Promise.resolve<GetDatasourcesResponse>({
          items: responseItems,
          total: 10,
          page: 1,
          perPage: 10,
          success: true,
        });
      }
    }
    return Promise.reject(new Error(`MOCK: unknown policy list api: ${path}`));
  });
};

/**
 * Utilities for testing Redux middleware
 */
export interface MiddlewareActionSpyHelper<S = GlobalState> {
  /**
   * Returns a promise that is fulfilled when the given action is dispatched or a timeout occurs.
   * The use of this method instead of a `sleep()` type of delay should avoid test case instability
   * especially when run in a CI environment.
   *
   * @param actionType
   */
  waitForAction: (actionType: AppAction['type']) => Promise<void>;
  /**
   * A property holding the information around the calls that were processed by the  internal
   * `actionSpyMiddlware`. This property holds the information typically found in Jets's mocked
   * function `mock` property - [see here for more information](https://jestjs.io/docs/en/mock-functions#mock-property)
   *
   * **Note**: this property will only be set **after* the `actionSpyMiddlware` has been
   * initialized (ex. via `createStore()`. Attempting to reference this property before that time
   * will throw an error.
   * Also - do not hold on to references to this property value if `jest.clearAllMocks()` or
   * `jest.resetAllMocks()` is called between usages of the value.
   */
  dispatchSpy: jest.Mock<Dispatch<AppAction>>['mock'];
  /**
   * Redux middleware that enables spying on the action that are dispatched through the store
   */
  actionSpyMiddleware: ReturnType<MiddlewareFactory<S>>;
}

/**
 * Creates a new instance of middleware action helpers
 * Note: in most cases (testing concern specific middleware) this function should be given
 * the state type definition, else, the global state will be used.
 *
 * @example
 * // Use in Policy List middleware testing
 * const middlewareSpyUtils = createSpyMiddleware<PolicyListState>();
 * store = createStore(
 *    policyListReducer,
 *    applyMiddleware(
 *      policyListMiddlewareFactory(fakeCoreStart, depsStart),
 *      middlewareSpyUtils.actionSpyMiddleware
 *    )
 * );
 * // Reference `dispatchSpy` ONLY after creating the store that includes `actionSpyMiddleware`
 * const { waitForAction, dispatchSpy } = middlewareSpyUtils;
 * //
 * // later in test
 * //
 * it('...', async () => {
 *   //...
 *   await waitForAction('serverReturnedPolicyListData');
 *   // do assertions
 *   // or check how action was called
 *   expect(dispatchSpy.calls.length).toBe(2)
 * });
 */
export const createSpyMiddleware = <S = GlobalState>(): MiddlewareActionSpyHelper<S> => {
  type ActionWatcher = (action: AppAction) => void;

  const watchers = new Set<ActionWatcher>();
  let spyDispatch: jest.Mock<Dispatch<AppAction>>;

  return {
    waitForAction: async (actionType: string) => {
      // Error is defined here so that we get a better stack trace that points to the test from where it was used
      const err = new Error(`action '${actionType}' was not dispatched within the allocated time`);

      await new Promise((resolve, reject) => {
        const watch: ActionWatcher = action => {
          if (action.type === actionType) {
            watchers.delete(watch);
            clearTimeout(timeout);
            resolve();
          }
        };

        // We timeout before jest's default 5s, so that a better error stack is returned
        const timeout = setTimeout(() => {
          watchers.delete(watch);
          reject(err);
        }, 4500);
        watchers.add(watch);
      });
    },

    get dispatchSpy() {
      if (!spyDispatch) {
        throw new Error(
          'Spy Middleware has not been initialized. Access this property only after using `actionSpyMiddleware` in a redux store'
        );
      }
      return spyDispatch.mock;
    },

    actionSpyMiddleware: api => {
      return next => {
        spyDispatch = jest.fn(action => {
          next(action);
          // loop through the list of watcher (if any) and call them with this action
          for (const watch of watchers) {
            watch(action);
          }
          return action;
        });
        return spyDispatch;
      };
    },
  };
};
