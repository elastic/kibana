/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * See https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj591569(v%3dpandp.10)
 */
// TODO: Type this library
export function sagaMiddleware(saga) {
  const iteratorInstances = new Set();
  const { promise: dispatchPromise, resolve: resolveDispatch } = promiseFactory();

  async function* iterator() {
    const instance = { queue: [], nextResolve: null };
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

  function enqueue(value) {
    for (const iteratorInstance of iteratorInstances) {
      iteratorInstance.queue.push(value);
      if (iteratorInstance.nextResolve !== null) {
        iteratorInstance.nextResolve(iteratorInstance.queue.shift());
        iteratorInstance.nextResolve = null;
      }
    }
  }

  dispatchPromise.then(function(dispatch) {
    saga({
      actionsAndState: iterator,
      dispatch,
    });
  });

  return function middleware({ getState, dispatch }) {
    resolveDispatch(dispatch);
    return next => action => {
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
  };
}

function promiseFactory() {
  let resolve = null;
  let reject = null;
  const newPromise = new Promise(function(resolveFunction, rejectFunction) {
    resolve = resolveFunction;
    reject = rejectFunction;
  });
  return {
    promise: newPromise,
    resolve,
    reject,
  };
}
