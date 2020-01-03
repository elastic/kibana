/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { GlobalState } from '../types';

interface StoreAction extends AnyAction {
  payload: unknown[];
  type: string;
}

interface QueuedAction {
  action: StoreAction;
  state: GlobalState;
}

interface IteratorInstance {
  queue: QueuedAction[];
  nextResolve: null | ((inst: QueuedAction) => void);
}

type Saga = (storeContext: SagaContext) => Promise<void>;

type StoreActionsAndState = AsyncIterableIterator<QueuedAction>;

export interface SagaContext {
  /**
   * A generator function that will `yield` a `Promise` that resolves with a `QueuedAction`
   */
  actionsAndState: () => StoreActionsAndState;
  dispatch: Dispatch;
}

const noop = () => {};

/**
 * Creates Saga Middleware for use with Redux.
 *
 * @param {Saga} saga The `saga` should initialize a long-running `for await...of` loop against
 * the return value of the `actionsAndState()` method provided by the `SagaContext`.
 *
 * @return {Middleware}
 *
 * @example
 *
 * const endpointsSaga = async ({ actionsAndState, dispatch }: SagaContext) => {
 *   for await (const { action, state } of actionsAndState()) {
 *     if (action.type === "userRequestedResource") {
 *       const resourceData = await doApiFetch('of/some/resource');
 *       dispatch({
 *         type: 'serverReturnedUserRequestedResource',
 *         payload: [ resourceData ]
 *       });
 *     }
 *   }
 * }
 * const endpointsSagaMiddleware = createSagaMiddleware(endpointsSaga);
 * //....
 * const store = createStore(reducers, [ endpointsSagaMiddleware ]);
 */
export function createSagaMiddleware(saga: Saga): Middleware {
  const iteratorInstances = new Set<IteratorInstance>();
  let runSaga: () => void = noop;

  async function* getActionsAndStateIterator(): StoreActionsAndState {
    const instance: IteratorInstance = { queue: [], nextResolve: null };
    iteratorInstances.add(instance);
    try {
      while (true) {
        yield await nextActionAndState();
      }
    } finally {
      // If the consumer stops consuming this (e.g. `break` or `return` is called in the `for await`
      // then this `finally` block will run and unregister this instance and reset `runSaga`
      iteratorInstances.delete(instance);
      runSaga = noop;
    }

    function nextActionAndState() {
      if (instance.queue.length) {
        return Promise.resolve(instance.queue.shift() as QueuedAction);
      } else {
        return new Promise<QueuedAction>(function(resolve) {
          instance.nextResolve = resolve;
        });
      }
    }
  }

  function enqueue(value: QueuedAction) {
    for (const iteratorInstance of iteratorInstances) {
      iteratorInstance.queue.push(value);
      if (iteratorInstance.nextResolve !== null) {
        iteratorInstance.nextResolve(iteratorInstance.queue.shift() as QueuedAction);
        iteratorInstance.nextResolve = null;
      }
    }
  }

  function middleware({ getState, dispatch }: MiddlewareAPI) {
    if (runSaga === noop) {
      runSaga = saga.bind<null, SagaContext, any[], Promise<void>>(null, {
        actionsAndState: getActionsAndStateIterator,
        dispatch,
      });
      runSaga();
    }
    return (next: Dispatch<StoreAction>) => (action: StoreAction) => {
      // Call the next dispatch method in the middleware chain.
      const returnValue = next(action);

      enqueue({
        action,
        state: getState(),
      });

      // This will likely be the action itself, unless a middleware further in chain changed it.
      return returnValue;
    };
  }

  return middleware;
}
