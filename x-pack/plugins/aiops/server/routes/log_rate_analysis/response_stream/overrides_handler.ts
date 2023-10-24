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
  type AiopsLogRateAnalysisSchema,
} from '../../../common/api/log_rate_analysis';

import type { StreamLoaded } from './loaded';
import type { LogDebugMessage, StreamPush } from './types';

export const overridesHandlerFactory =
  (
    params: AiopsLogRateAnalysisSchema,
    logDebugMessage: LogDebugMessage,
    push: StreamPush,
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
