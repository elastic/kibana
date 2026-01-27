/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { createCallApmApi } from './src/create_call_apm_api';
export type {
  APMClient,
  APIReturnType,
  APMClientOptions,
  AutoAbortedAPMClient,
  AbstractAPMClient,
  APIClientRequestParamsOf,
} from './src/create_call_apm_api';
export { clearCache } from './src/call_api';
