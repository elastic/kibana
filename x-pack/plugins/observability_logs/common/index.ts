/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'observabilityLogs';
export const PLUGIN_NAME = 'observabilityLogs';

/**
 * Exporting versioned APIs types
 */
export type { FindIntegrationsRequestQuery, FindIntegrationsResponse } from './latest';
export {
  INTEGRATIONS_URL,
  getIntegrationsUrl,
  findIntegrationsResponseRT,
  findIntegrationsRequestQueryRT,
} from './latest';
export * as integrationsV1 from './integrations/v1';
