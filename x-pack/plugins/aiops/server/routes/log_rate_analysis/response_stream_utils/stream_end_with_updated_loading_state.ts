/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';

import {
  updateLoadingState,
  type AiopsLogRateAnalysisApiAction,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';

/**
 * Helper function that will push a message to the stream that it's done and
 * then run a callback to end the actual stream.
 * This is implemented as a factory that receives the necessary dependencies
 * which then returns the actual helper function.
 */
export const streamEndWithUpdatedLoadingStateFactory = (
  streamEndCallback: () => void,
  push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction>['push']
) => {
  return function endWithUpdatedLoadingState() {
    push(
      updateLoadingState({
        ccsWarning: false,
        loaded: 1,
        loadingState: i18n.translate('xpack.aiops.logRateAnalysis.loadingState.doneMessage', {
          defaultMessage: 'Done.',
        }),
      })
    );

    streamEndCallback();
  };
};
