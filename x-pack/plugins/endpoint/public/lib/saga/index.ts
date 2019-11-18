/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';

/**
 * See https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj591569(v%3dpandp.10)
 */
// TODO: Type this library
export function createSagaMiddleware(saga: () => Promise<void>) {
  // Q. Are we following the Flux standard? https://github.com/redux-utilities/flux-standard-action

  interface StoreAction {
    payload: unknown[];
    type: string;
  }

  interface QueuedAction {
    action: StoreAction;
    state: unknown;
  }

  interface IteratorInstance {
    queue: QueuedAction[];
    nextResolve: null | ((inst: QueuedAction) => void);
  }

  const iteratorInstances = new Set<IteratorInstance>();

  async function* iterator() {
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
        return Promise.resolve(instance.queue.shift());
      } else {
        return new Promise(function(resolve) {
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
  function middleware({ getState, dispatch }: { getState: () => unknown; dispatch: Dispatch }) {
    runSaga = saga.bind(null, {
      actionsAndState: iterator,
      dispatch,
    });
    return (next: (a: unknown) => (a: StoreAction) => StoreAction) => (action: StoreAction) => {
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
