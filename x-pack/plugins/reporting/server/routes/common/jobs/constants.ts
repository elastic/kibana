/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_CODES = {
  COMPLETED: 200,
  PENDING: {
    INTERNAL: 202,
    PUBLIC: 503,
  },
  FAILED: {
    INTERNAL: 202,
    PUBLIC: 500,
  },
};
