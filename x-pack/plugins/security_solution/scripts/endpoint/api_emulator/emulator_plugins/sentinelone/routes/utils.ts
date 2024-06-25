/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The base API path for the API requests for sentinelone. Value is the same as the one defined here:
// `x-pack/plugins/stack_connectors/server/connector_types/sentinelone/sentinelone.ts:50`
const BASE_API_PATH = '/web/api/v2.1';

export const buildSentinelOneRoutePath = (path: string): string => {
  if (!path.startsWith('/')) {
    throw new Error(`'path' must start with '/'!`);
  }

  return `${BASE_API_PATH}${path}`;
};
