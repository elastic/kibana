/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AiopsExplainLogRateSpikesSchema,
  AiopsExplainLogRateSpikesApiAction,
} from './explain_log_rate_spikes';
import type { AiopsExampleStreamSchema, AiopsExampleStreamApiAction } from './example_stream';

export const API_ENDPOINT = {
  EXAMPLE_STREAM: '/internal/aiops/example_stream',
  EXPLAIN_LOG_RATE_SPIKES: '/internal/aiops/explain_log_rate_spikes',
} as const;
export type ApiEndpoint = typeof API_ENDPOINT[keyof typeof API_ENDPOINT];

export interface ApiEndpointOptions {
  [API_ENDPOINT.EXAMPLE_STREAM]: AiopsExampleStreamSchema;
  [API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES]: AiopsExplainLogRateSpikesSchema;
}

export interface ApiEndpointActions {
  [API_ENDPOINT.EXAMPLE_STREAM]: AiopsExampleStreamApiAction;
  [API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES]: AiopsExplainLogRateSpikesApiAction;
}
