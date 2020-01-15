/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { GlobalState } from '../store';

interface QueuedAction<TAction = AnyAction> {
  /**
   * The Redux action that was dispatched
   */
  action: TAction;
  /**
   * The Global state at the time the action was dispatched
   */
  state: GlobalState;
}

interface IteratorInstance {
  queue: QueuedAction[];
  nextResolve: null | ((inst: QueuedAction) => void);
}

type Saga = (storeContext: SagaContext) => Promise<void>;

type StoreActionsAndState<TAction = AnyAction> = AsyncIterableIterator<QueuedAction<TAction>>;

export interface SagaContext<TAction extends AnyAction = AnyAction> {
  /**
   * A generator function that will `yield` `Promise`s that resolve with a `QueuedAction`
   */
  actionsAndState: () => StoreActionsAndState<TAction>;
  dispatch: Dispatch<TAction>;
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
 * type TPossibleActions = { type: 'add', payload: any[] };
 * //...
 * const endpointsSaga = async ({ actionsAndState, dispatch }: SagaContext<TPossibleActions>) => {
 *   for await (const { action, state } of actionsAndState()) {
 *     if (action.type === "userRequestedResource") {
 *       const resourceData = await doApiFetch('of/some/resource');
 *       dispatch({
 *         type: 'add',
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
    return (next: Dispatch<AnyAction>) => (action: AnyAction) => {
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
