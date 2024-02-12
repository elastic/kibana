/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';

import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '../../../../common/api/log_rate_analysis/schema';

import type { LogDebugMessage } from './log_debug_message';

import {
  addErrorAction,
  type AiopsLogRateAnalysisApiAction,
} from '../../../../common/api/log_rate_analysis/actions';

/**
 * Helper function that will push an error message to the stream.
 * This is implemented as a factory that receives the necessary dependencies
 * which then returns the actual helper function.
 */
export const streamPushErrorFactory = <T extends ApiVersion>(
  push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction<T>>['push'],
  logDebugMessage: LogDebugMessage
) => {
  return function pushError(m: string) {
    logDebugMessage('Push error.');
    push(addErrorAction(m));
  };
};
