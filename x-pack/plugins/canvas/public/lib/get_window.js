/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// return window if it exists, otherwise just return an object literal
const windowObj = {};

export const getWindow = () => {
  return typeof window === 'undefined' ? windowObj : window;
};
