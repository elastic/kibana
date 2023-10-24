/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Headers, KibanaRequestEvents } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { streamFactory } from '@kbn/ml-response-stream/server';

import {
  addErrorAction,
  pingAction,
  resetAllAction,
  resetErrorsAction,
  resetGroupsAction,
  updateLoadingStateAction,
  AiopsLogRateAnalysisApiAction,
} from '../../../../common/api/log_rate_analysis/actions';

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../../common/api/log_rate_analysis/schema';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

interface StreamState {
  isRunning: boolean;
  loaded: number;
  shouldStop: boolean;
}

const getDefaultStreamState = (): StreamState => ({
  isRunning: false,
  loaded: 0,
  shouldStop: false,
});

export const logRateAnalysisResponseStreamFactory = <T extends ApiVersion>(
  params: AiopsLogRateAnalysisSchema<T>,
  events: KibanaRequestEvents,
  headers: Headers,
  logger: Logger
) => {
  let logMessageCounter = 0;

  const logDebugMessage = (msg: string) => {
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
    params.compressResponse,
    params.flushFix
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

  function loaded(): number;
  function loaded(d: number, replace?: boolean): undefined;
  function loaded(d?: number, replace = true) {
    if (typeof d === 'number') {
      if (replace) {
        state.loaded = d;
      } else {
        state.loaded += d;
      }
    } else {
      return state.loaded;
    }
  }

  function shouldStop(d?: boolean) {
    if (typeof d === 'boolean') {
      state.shouldStop = d;
    } else {
      return state.shouldStop;
    }
  }

  function overridesHandler() {
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
  }

  return {
    abortSignal,
    end,
    endWithUpdatedLoadingState,
    isRunning,
    loaded,
    logDebugMessage,
    overridesHandler,
    push,
    pushError,
    pushPingWithTimeout,
    responseWithHeaders,
    shouldStop,
  };
};
