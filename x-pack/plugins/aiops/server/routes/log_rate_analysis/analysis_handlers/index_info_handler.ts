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
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { fetchIndexInfo } from '@kbn/aiops-log-rate-analysis/queries/fetch_index_info';

import type { ResponseStreamFetchOptions } from '../response_stream_factory';
import { LOADED_FIELD_CANDIDATES } from '../response_stream_utils/constants';

export const indexInfoHandlerFactory =
  <T extends ApiVersion>(options: ResponseStreamFetchOptions<T>) =>
  async () => {
    const {
      abortSignal,
      client,
      logDebugMessage,
      logger,
      requestBody,
      responseStream,
      stateHandler,
    } = options;

    const fieldCandidates: string[] = [];
    let fieldCandidatesCount = fieldCandidates.length;

    const textFieldCandidates: string[] = [];
    let textFieldCandidatesCount = textFieldCandidates.length;

    let zeroDocsFallback = false;

    if (!requestBody.overrides?.remainingFieldCandidates) {
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

      try {
        const indexInfo = await fetchIndexInfo(
          client,
          requestBody,
          ['message', 'error.message'],
          abortSignal
        );

        logDebugMessage(`Baseline document count: ${indexInfo.baselineTotalDocCount}`);
        logDebugMessage(`Deviation document count: ${indexInfo.deviationTotalDocCount}`);

        fieldCandidates.push(...indexInfo.fieldCandidates);
        fieldCandidatesCount = fieldCandidates.length;
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
                fieldCandidatesCount: fieldCandidatesCount + textFieldCandidatesCount,
              },
            }
          ),
        })
      );

      responseStream.push(setZeroDocsFallback(zeroDocsFallback));

      if (fieldCandidatesCount === 0) {
        responseStream.endWithUpdatedLoadingState();
      } else if (stateHandler.shouldStop()) {
        logDebugMessage('shouldStop after fetching field candidates.');
        responseStream.end();
        return;
      }
    }

    return { fieldCandidates, textFieldCandidates, zeroDocsFallback };
  };
