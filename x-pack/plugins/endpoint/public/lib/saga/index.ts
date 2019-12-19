/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';
import { GlobalState } from '../../types';

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

type StoreActionsAndState = AsyncIterableIterator<QueuedAction>;

export interface SagaContext {
  actionsAndState: () => StoreActionsAndState;
  dispatch: Dispatch;
}

/**
 * See https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj591569(v%3dpandp.10)
 */
export function createSagaMiddleware(
  saga: (storeContext: SagaContext) => Promise<void>
): Middleware & { run: () => void } {
  const iteratorInstances = new Set<IteratorInstance>();

  async function* getActionsAndStateIterator(): StoreActionsAndState {
    const instance: IteratorInstance = { queue: [], nextResolve: null };
    iteratorInstances.add(instance);
    try {
      while (true) {
        yield await nextActionAndState();
      }
    } finally {
      /**
       * If the consumer stops consuming this (e.g. `break` or `return` is called in the `for await`
       * then this `finally` block will run and unregister this instance
       */
      iteratorInstances.delete(instance);
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

  let runSaga: () => void;
  function middleware({ getState, dispatch }: MiddlewareAPI) {
    runSaga = saga.bind<null, SagaContext, any[], Promise<void>>(null, {
      actionsAndState: getActionsAndStateIterator,
      dispatch,
    });
    return (next: Dispatch<StoreAction>) => (action: StoreAction) => {
      // Call the next dispatch method in the middleware chain.
      const returnValue = next(action);

      enqueue({
        action,
        state: getState(),
      });

      // This will likely be the action itself, unless
      // a middleware further in chain changed it.
      return returnValue;
    };
  }

  middleware.run = function() {
    runSaga();
  };

  return middleware;
}
