/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// to work around the need for wrapping all of our promises in $q for our angular code
// we replace the native Promise with $q.
// For pages which are mainly react, initPromise should be called with false
// and any calls to promises in angular code wrapped in $q.when
// once we're free of angular this file can be removed.

const promise = window.Promise;

export function initPromise(replacePromise) {
  return function ($q) {
    window.Promise = replacePromise ? $q : promise;
    return Promise.resolve();
  };
}
