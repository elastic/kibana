/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { streamFactory, type StreamFactoryReturnType } from '@kbn/ml-response-stream/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Headers, KibanaRequestEvents } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';

import {
  addErrorAction,
  pingAction,
  updateLoadingStateAction,
  AiopsLogRateAnalysisApiAction,
} from '../../../../common/api/log_rate_analysis/actions';

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../../common/api/log_rate_analysis/schema';

import { loadedFactory, type StreamLoaded } from './loaded';
import { indexInfoHandlerFactory } from './index_info_handler';
import { overridesHandlerFactory } from './overrides_handler';
import { significantItemsHandlerFactory } from './significant_items_handler';
import type { LogDebugMessage, StreamState } from './types';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

const getDefaultStreamState = (): StreamState => ({
  isRunning: false,
  loaded: 0,
  shouldStop: false,
});

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
  end: () => void;
  endWithUpdatedLoadingState: () => void;
  push: StreamFactoryReturnType<AiopsLogRateAnalysisApiAction<T>>['push'];
  pushPingWithTimeout: () => void;
  pushError: (msg: string) => void;
  loaded: StreamLoaded;
  sampleProbability: number;
  shouldStop: (d?: boolean) => boolean | undefined;
}

export const logRateAnalysisResponseStreamFactory = <T extends ApiVersion>(
  options: LogRateAnalysisResponseStreamOptions<T>
) => {
  const { events, headers, logger, requestBody } = options;

  const sampleProbability = requestBody.sampleProbability ?? 1;

  let logMessageCounter = 0;

  const logDebugMessage: LogDebugMessage = (msg: string) => {
    logMessageCounter++;
    logger.debug(`Log Rate Analysis #${logMessageCounter}: ${msg}`);
  };

  const controller = new AbortController();
  const abortSignal = controller.signal;

  const state = getDefaultStreamState();

  events.aborted$.subscribe(() => {
    logDebugMessage('aborted$ subscription trigger.');
    state.shouldStop = true;
    controller.abort();
  });
  events.completed$.subscribe(() => {
    logDebugMessage('completed$ subscription trigger.');
    state.shouldStop = true;
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

  function pushPingWithTimeout() {
    setTimeout(() => {
      if (state.isRunning) {
        logDebugMessage('Ping message.');
        push(pingAction());
        pushPingWithTimeout();
      }
    }, PING_FREQUENCY);
  }

  function end() {
    if (state.isRunning) {
      state.isRunning = false;
      logDebugMessage('Ending analysis.');
      streamEnd();
    } else {
      logDebugMessage('end() was called again with isRunning already being false.');
    }
  }

  function endWithUpdatedLoadingState() {
    push(
      updateLoadingStateAction({
        ccsWarning: false,
        loaded: 1,
        loadingState: i18n.translate('xpack.aiops.logRateAnalysis.loadingState.doneMessage', {
          defaultMessage: 'Done.',
        }),
      })
    );

    end();
  }

  function pushError(m: string) {
    logDebugMessage('Push error.');
    push(addErrorAction(m));
  }

  function isRunning(d?: boolean) {
    if (typeof d === 'boolean') {
      state.isRunning = d;
    } else {
      return state.isRunning;
    }
  }

  function shouldStop(d?: boolean) {
    if (typeof d === 'boolean') {
      state.shouldStop = d;
    } else {
      return state.shouldStop;
    }
  }

  const loaded = loadedFactory(state);

  const streamFetchOptions: LogRateAnalysisResponseStreamFetchOptions<T> = {
    ...options,
    abortSignal,
    logDebugMessage,
    end,
    endWithUpdatedLoadingState,
    push,
    pushPingWithTimeout,
    pushError,
    loaded,
    sampleProbability,
    shouldStop,
  };

  const indexInfoHandler = indexInfoHandlerFactory(streamFetchOptions);
  const overridesHandler = overridesHandlerFactory(streamFetchOptions);
  const significantItemsHandler = significantItemsHandlerFactory(streamFetchOptions);

  return {
    ...streamFetchOptions,
    indexInfoHandler,
    isRunning,
    overridesHandler,
    responseWithHeaders,
    significantItemsHandler,
  };
};
