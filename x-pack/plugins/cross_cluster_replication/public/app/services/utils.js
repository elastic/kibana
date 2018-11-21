/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIMULATE_HTTP_LATENCY } from '../constants';

/**
 * Utilty to add some latency in a Promise chain
 *
 * @param {number} time Time in millisecond to wait
 * @param {boolean} isOnlyForDevelopment Flag to indicate if it's only for devlopment purpose
 */
export const wait = (time, onlyForDevelopment = true) => (data) => {
  if (onlyForDevelopment && !SIMULATE_HTTP_LATENCY) {
    return Promise.resolve(data);
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(data), time);
  });
};

export const object = {
  toArray(obj) {
    return Object.keys(obj).map(k => ({ ...obj[k], __id__: k }));
  },
};
