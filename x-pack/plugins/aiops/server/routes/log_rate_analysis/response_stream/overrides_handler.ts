/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resetAllAction,
  resetErrorsAction,
  resetGroupsAction,
} from '../../../../common/api/log_rate_analysis/actions';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '../../../../common/api/log_rate_analysis/schema';

import type { LogRateAnalysisResponseStreamFetchOptions } from './log_rate_analysis_response_stream';

export const overridesHandlerFactory =
  <T extends ApiVersion>({
    requestBody,
    logDebugMessage,
    responseStream,
    stateHandler,
  }: LogRateAnalysisResponseStreamFetchOptions<T>) =>
  () => {
    if (!requestBody.overrides) {
      logDebugMessage('Full Reset.');
      responseStream.push(resetAllAction());
    } else {
      logDebugMessage('Reset Errors.');
      responseStream.push(resetErrorsAction());
    }

    if (requestBody.overrides?.regroupOnly) {
      logDebugMessage('Reset Groups.');
      responseStream.push(resetGroupsAction());
    }

    if (requestBody.overrides?.loaded) {
      logDebugMessage(`Set 'loaded' override to '${requestBody.overrides?.loaded}'.`);
      stateHandler.loaded(requestBody.overrides?.loaded);
    }
  };
