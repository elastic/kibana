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
import { streamReducer } from './stream_reducer';

export const API_ENDPOINT = {
  EXPLAIN_LOG_RATE_SPIKES: '/internal/aiops/explain_log_rate_spikes',
} as const;

export interface ApiExplainLogRateSpikes {
  endpoint: typeof API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES;
  reducer: typeof streamReducer;
  body: AiopsExplainLogRateSpikesSchema;
  actions: AiopsExplainLogRateSpikesApiAction;
}
