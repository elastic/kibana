/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamFactory } from '@kbn/ml-response-stream/server';

import type { AiopsLogRateAnalysisApiAction } from '../../../common/api/log_rate_analysis';

export type LogDebugMessage = (msg: string) => void;

export type StreamPush = ReturnType<typeof streamFactory<AiopsLogRateAnalysisApiAction>>['push'];

export interface StreamState {
  isRunning: boolean;
  loaded: number;
  shouldStop: boolean;
}
