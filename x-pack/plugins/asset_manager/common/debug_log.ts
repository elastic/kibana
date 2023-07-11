/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function debug(...args: any[]) {
  if (process.env.NODE_ENV === 'production' || !process.env.DEBUG_LOGGER) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[DEBUG LOG]', ...args);
}
