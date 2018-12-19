/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const arrify = val => Array.isArray(val) ? val : [val];

/**
 * Utilty to add some latency in a Promise chain
 *
 * @param {number} time Time in millisecond to wait
 */
export const wait = (time = 1000) => (data) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), time);
  });
};
