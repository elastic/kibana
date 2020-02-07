/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { GlobalState } from '../types';

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

export interface SagaMiddleware extends Middleware {
  /**
   * Start the saga. Should be called after the `store` has been created
   */
  start: () => void;

  /**
   * Stop the saga by exiting the internal generator `for await...of` loop.
   */
  stop: () => void;
}

const noop = () => {};
const STOP = Symbol('STOP');

/**
 * Creates Saga Middleware for use with Redux.
 *
 * @param {Saga} saga The `saga` should initialize a long-running `for await...of` loop against
 * the return value of the `actionsAndState()` method provided by the `SagaContext`.
 *
 * @return {SagaMiddleware}
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
export function createSagaMiddleware(saga: Saga): SagaMiddleware {
  const iteratorInstances = new Set<IteratorInstance>();
  let runSaga: () => void = noop;
  let stopSaga: () => void = noop;
  let runningPromise: Promise<symbol>;

  async function* getActionsAndStateIterator(): StoreActionsAndState {
    const instance: IteratorInstance = { queue: [], nextResolve: null };
    iteratorInstances.add(instance);

    try {
      while (true) {
        const actionAndState = await Promise.race([nextActionAndState(), runningPromise]);

        if (actionAndState === STOP) {
          break;
        }

        yield actionAndState as QueuedAction;
      }
    } finally {
      // If the consumer stops consuming this (e.g. `break` or `return` is called in the `for await`
      // then this `finally` block will run and unregister this instance and reset `runSaga`
      iteratorInstances.delete(instance);
      runSaga = stopSaga = noop;
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

  middleware.start = () => {
    runningPromise = new Promise(resolve => (stopSaga = () => resolve(STOP)));
    runSaga();
  };

  middleware.stop = () => {
    stopSaga();
  };

  return middleware;
}
