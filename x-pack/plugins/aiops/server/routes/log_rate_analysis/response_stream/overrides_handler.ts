/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';

import {
  resetAllAction,
  resetErrorsAction,
  resetGroupsAction,
  type AiopsLogRateAnalysisApiAction,
} from '../../../../common/api/log_rate_analysis/actions';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../../common/api/log_rate_analysis/schema';

import type { StreamLoaded } from './loaded';
import type { LogDebugMessage } from './types';

export const overridesHandlerFactory =
  <T extends ApiVersion>(
    params: AiopsLogRateAnalysisSchema,
    logDebugMessage: LogDebugMessage,
    push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction<T>>['push'],
    loaded: StreamLoaded
  ) =>
  () => {
    if (!params.overrides) {
      logDebugMessage('Full Reset.');
      push(resetAllAction());
    } else {
      logDebugMessage('Reset Errors.');
      push(resetErrorsAction());
    }

    if (params.overrides?.regroupOnly) {
      logDebugMessage('Reset Groups.');
      push(resetGroupsAction());
    }

    if (params.overrides?.loaded) {
      logDebugMessage(`Set 'loaded' override to '${params.overrides?.loaded}'.`);
      loaded(params.overrides?.loaded);
    }
  };
