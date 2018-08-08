/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// A refactor of the original ML listener (three separate functions) into
// an object providing them as methods.

export function listenerFactoryProvider() {
  return function () {
    const listeners = [];
    return {
      changed(...args) {
        listeners.forEach((listener) => listener(...args));
      },
      watch(listener) {
        listeners.push(listener);
      },
      unwatch(listener) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      },
      unwatchAll() {
        listeners.splice(0);
      }
    };
  };
}
