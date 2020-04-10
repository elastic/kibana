/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { GetDatasourcesResponse, INGEST_API_DATASOURCES } from '../../services/ingest';
import { EndpointDocGenerator } from '../../../../../common/generate_data';
import { AppAction, GlobalState, MiddlewareFactory } from '../../types';

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
  waitForAction: (actionType: Pick<AppAction, 'type'>['type']) => Promise<void>; // FIXME: lets see if we can type the `actionType` as well based on AppAction
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
 * const { actionSpyMiddleware, waitForAction } = createSpyMiddleware<PolicyListState>();
 * store = createStore(
 *    policyListReducer,
 *    applyMiddleware(
 *      policyListMiddlewareFactory(fakeCoreStart, depsStart),
 *      actionSpyMiddleware
 *    )
 *  );
 * // later in test
 * it('...', async () => {
 *   //...
 *   await waitForAction('serverReturnedPolicyListData');
 *   // do assertion
 * });
 */
export const createSpyMiddleware = <S = GlobalState>(): MiddlewareActionSpyHelper<S> => {
  const sleep = (ms = 10) => new Promise(resolve => setTimeout(resolve, ms));
  const dispatchedActions: AppAction[] = [];

  return {
    waitForAction: async (actionType: string) => {
      const interval = 10; // milliseconds
      const timeout = 4000; // milliseconds
      // Error is defined here so that we get a better stack trace that points to the test from where it was used
      const err = new Error(`action '${actionType}' was not dispatched within the allocated time`);
      const startCheckingFrom = dispatchedActions.length === 0 ? 0 : dispatchedActions.length - 1;
      let elapsedTime = 0;
      let actionWasDispatched = false;

      while (!actionWasDispatched && elapsedTime < timeout) {
        for (let i = startCheckingFrom, t = dispatchedActions.length; i < t; i++) {
          if (dispatchedActions[i].type === actionType) {
            actionWasDispatched = true;
            break;
          }
        }
        await sleep(interval);
        elapsedTime += interval;
      }

      if (!actionWasDispatched) {
        throw err;
      }
    },

    actionSpyMiddleware: api => {
      return next => action => {
        next(action);
        dispatchedActions.push(action);
      };
    },
  };
};
