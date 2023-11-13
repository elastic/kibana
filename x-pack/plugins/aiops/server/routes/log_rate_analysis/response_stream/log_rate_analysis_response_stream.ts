/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamFactory, type StreamFactoryReturnType } from '@kbn/ml-response-stream/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Headers, KibanaRequestEvents } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';

import { type AiopsLogRateAnalysisApiAction } from '../../../../common/api/log_rate_analysis/actions';

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../../common/api/log_rate_analysis/schema';

import { indexInfoHandlerFactory } from './analysis_handlers/index_info_handler';
import { groupingHandlerFactory } from './analysis_handlers/grouping_handler';
import { histogramHandlerFactory } from './analysis_handlers/histogram_handler';
import { overridesHandlerFactory } from './analysis_handlers/overrides_handler';
import { significantItemsHandlerFactory } from './analysis_handlers/significant_items_handler';
import { overallHistogramHandlerFactory } from './analysis_handlers/overall_histogram_handler';
import { logDebugMessageFactory, type LogDebugMessage } from './log_debug_message';
import { stateHandlerFactory, type StateHandler } from './state_handler';
import { streamEndFactory } from './stream_end';
import { streamEndWithUpdatedLoadingStateFactory } from './stream_end_with_updated_loading_state';
import { streamPushErrorFactory } from './stream_push_error';
import { streamPushPingWithTimeoutFactory } from './stream_push_ping_with_timeout';

export interface LogRateAnalysisResponseStreamOptions<T extends ApiVersion> {
  version: T;
  client: ElasticsearchClient;
  requestBody: AiopsLogRateAnalysisSchema<T>;
  events: KibanaRequestEvents;
  headers: Headers;
  logger: Logger;
}

export interface LogRateAnalysisResponseStreamFetchOptions<T extends ApiVersion>
  extends LogRateAnalysisResponseStreamOptions<T> {
  abortSignal: AbortSignal;
  logDebugMessage: LogDebugMessage;
  responseStream: {
    end: () => void;
    endWithUpdatedLoadingState: () => void;
    push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction<T>>['push'];
    pushPingWithTimeout: () => void;
    pushError: (msg: string) => void;
  };
  stateHandler: StateHandler;
}

export const logRateAnalysisResponseStreamFactory = <T extends ApiVersion>(
  options: LogRateAnalysisResponseStreamOptions<T>
) => {
  const { events, headers, logger, requestBody } = options;

  const logDebugMessage = logDebugMessageFactory(logger);
  const state = stateHandlerFactory({
    groupingEnabled: !!requestBody.grouping,
    sampleProbability: requestBody.sampleProbability ?? 1,
  });
  const controller = new AbortController();
  const abortSignal = controller.signal;

  events.aborted$.subscribe(() => {
    logDebugMessage('aborted$ subscription trigger.');
    state.shouldStop(true);
    controller.abort();
  });
  events.completed$.subscribe(() => {
    logDebugMessage('completed$ subscription trigger.');
    state.shouldStop(true);
    controller.abort();
  });

  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<AiopsLogRateAnalysisApiAction<T>>(
    headers,
    logger,
    requestBody.compressResponse,
    requestBody.flushFix
  );

  const pushPingWithTimeout = streamPushPingWithTimeoutFactory<T>(state, push, logDebugMessage);
  const end = streamEndFactory(state, streamEnd, logDebugMessage);
  const endWithUpdatedLoadingState = streamEndWithUpdatedLoadingStateFactory(end, push);
  const pushError = streamPushErrorFactory(push, logDebugMessage);

  const streamFetchOptions: LogRateAnalysisResponseStreamFetchOptions<T> = {
    ...options,
    abortSignal,
    logDebugMessage,
    responseStream: {
      end,
      endWithUpdatedLoadingState,
      push,
      pushError,
      pushPingWithTimeout,
    },
    stateHandler: state,
  };

  return {
    ...streamFetchOptions,
    analysis: {
      indexInfoHandler: indexInfoHandlerFactory(streamFetchOptions),
      groupingHandler: groupingHandlerFactory(streamFetchOptions),
      histogramHandler: histogramHandlerFactory(streamFetchOptions),
      overallHistogramHandler: overallHistogramHandlerFactory(streamFetchOptions),
      overridesHandler: overridesHandlerFactory(streamFetchOptions),
      significantItemsHandler: significantItemsHandlerFactory(streamFetchOptions),
    },
    responseWithHeaders,
  };
};
