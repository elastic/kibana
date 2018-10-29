/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const createError = err => ({
  type: 'error',
  error: {
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    message: typeof err === 'string' ? err : err.message,
  },
});
