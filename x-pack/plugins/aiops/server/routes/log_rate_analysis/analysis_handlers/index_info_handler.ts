/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import {
  updateLoadingState,
  setZeroDocsFallback,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { fetchIndexInfo } from '@kbn/aiops-log-rate-analysis/queries/fetch_index_info';

import type { ResponseStreamFetchOptions } from '../response_stream_factory';
import { LOADED_FIELD_CANDIDATES } from '../response_stream_utils/constants';

export const indexInfoHandlerFactory =
  <T extends ApiVersion>(options: ResponseStreamFetchOptions<T>) =>
  async () => {
    const {
      abortSignal,
      esClient,
      logDebugMessage,
      logger,
      requestBody,
      responseStream,
      stateHandler,
      version,
    } = options;

    const keywordFieldCandidates: string[] = [];
    let keywordFieldCandidatesCount = keywordFieldCandidates.length;

    const textFieldCandidates: string[] = [];
    let textFieldCandidatesCount = textFieldCandidates.length;

    let zeroDocsFallback = false;

    logDebugMessage('Fetch index information.');
    responseStream.push(
      updateLoadingState({
        ccsWarning: false,
        loaded: stateHandler.loaded(),
        loadingState: i18n.translate(
          'xpack.aiops.logRateAnalysis.loadingState.loadingIndexInformation',
          {
            defaultMessage: 'Loading index information.',
          }
        ),
      })
    );

    let skipFieldCandidates = false;

    if (version === '2') {
      skipFieldCandidates = Array.isArray(
        (requestBody as AiopsLogRateAnalysisSchema<'2'>).overrides?.remainingFieldCandidates
      );
    } else if (version === '3') {
      skipFieldCandidates =
        Array.isArray(
          (requestBody as AiopsLogRateAnalysisSchema<'3'>).overrides
            ?.remainingKeywordFieldCandidates
        ) ||
        Array.isArray(
          (requestBody as AiopsLogRateAnalysisSchema<'3'>).overrides?.remainingTextFieldCandidates
        );
    }

    try {
      const indexInfo = await fetchIndexInfo({
        esClient,
        abortSignal,
        arguments: {
          ...requestBody,
          textFieldCandidatesOverrides: ['message', 'error.message'],
          skipFieldCandidates,
        },
      });

      logDebugMessage(`Baseline document count: ${indexInfo.baselineTotalDocCount}`);
      logDebugMessage(`Deviation document count: ${indexInfo.deviationTotalDocCount}`);

      keywordFieldCandidates.push(...indexInfo.keywordFieldCandidates);
      keywordFieldCandidatesCount = keywordFieldCandidates.length;
      textFieldCandidates.push(...indexInfo.textFieldCandidates);
      textFieldCandidatesCount = textFieldCandidates.length;
      zeroDocsFallback = indexInfo.zeroDocsFallback;
    } catch (e) {
      if (!isRequestAbortedError(e)) {
        logger.error(`Failed to fetch index information, got: \n${e.toString()}`);
        responseStream.pushError(`Failed to fetch index information.`);
      }
      responseStream.end();
      return;
    }

    stateHandler.loaded(LOADED_FIELD_CANDIDATES, false);

    responseStream.pushPingWithTimeout();

    responseStream.push(
      updateLoadingState({
        ccsWarning: false,
        loaded: stateHandler.loaded(),
        loadingState: i18n.translate(
          'xpack.aiops.logRateAnalysis.loadingState.identifiedFieldCandidates',
          {
            defaultMessage:
              'Identified {fieldCandidatesCount, plural, one {# field candidate} other {# field candidates}}.',
            values: {
              fieldCandidatesCount: keywordFieldCandidatesCount + textFieldCandidatesCount,
            },
          }
        ),
      })
    );

    responseStream.push(setZeroDocsFallback(zeroDocsFallback));

    if (
      !skipFieldCandidates &&
      keywordFieldCandidatesCount === 0 &&
      textFieldCandidatesCount === 0
    ) {
      responseStream.endWithUpdatedLoadingState();
    } else if (stateHandler.shouldStop()) {
      logDebugMessage('shouldStop after fetching field candidates.');
      responseStream.end();
      return;
    }

    return { keywordFieldCandidates, textFieldCandidates, zeroDocsFallback };
  };
