/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';

import {
  pingAction,
  type AiopsLogRateAnalysisApiAction,
} from '../../../../common/api/log_rate_analysis/actions';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '../../../../common/api/log_rate_analysis/schema';

import type { LogDebugMessage } from './log_debug_message';
import type { StateHandler } from './state_handler';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

export const streamPushPingWithTimeoutFactory = <T extends ApiVersion>(
  stateHandler: StateHandler,
  push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction<T>>['push'],
  logDebugMessage: LogDebugMessage
) => {
  return function pushPingWithTimeout() {
    setTimeout(() => {
      if (stateHandler.isRunning()) {
        logDebugMessage('Ping message.');
        push(pingAction());
        pushPingWithTimeout();
      }
    }, PING_FREQUENCY);
  };
};
