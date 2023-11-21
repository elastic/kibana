/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AIOPS_API_ENDPOINT = {
  LOG_RATE_ANALYSIS: '/internal/aiops/log_rate_analysis',
  CATEGORIZATION_FIELD_VALIDATION: '/internal/aiops/categorization_field_validation',
} as const;

type AiopsApiEndpointKeys = keyof typeof AIOPS_API_ENDPOINT;
export type AiopsApiEndpoint = typeof AIOPS_API_ENDPOINT[AiopsApiEndpointKeys];
