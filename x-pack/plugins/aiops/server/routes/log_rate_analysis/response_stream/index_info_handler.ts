/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { updateLoadingStateAction } from '../../../../common/api/log_rate_analysis/actions';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '../../../../common/api/log_rate_analysis/schema';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { fetchIndexInfo } from '../queries/fetch_index_info';
import type { LogRateAnalysisResponseStreamFetchOptions } from './log_rate_analysis_response_stream';

import { LOADED_FIELD_CANDIDATES } from './constants';

export const indexInfoHandlerFactory =
  <T extends ApiVersion>(options: LogRateAnalysisResponseStreamFetchOptions<T>) =>
  async () => {
    const {
      abortSignal,
      client,
      end,
      endWithUpdatedLoadingState,
      logDebugMessage,
      logger,
      push,
      pushError,
      pushPingWithTimeout,
      requestBody,
      stateHandler,
    } = options;

    const fieldCandidates: string[] = [];
    let fieldCandidatesCount = fieldCandidates.length;

    const textFieldCandidates: string[] = [];

    let totalDocCount = 0;

    if (!requestBody.overrides?.remainingFieldCandidates) {
      logDebugMessage('Fetch index information.');
      push(
        updateLoadingStateAction({
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

        fieldCandidates.push(...indexInfo.fieldCandidates);
        fieldCandidatesCount = fieldCandidates.length;
        textFieldCandidates.push(...indexInfo.textFieldCandidates);
        totalDocCount = indexInfo.totalDocCount;
      } catch (e) {
        if (!isRequestAbortedError(e)) {
          logger.error(`Failed to fetch index information, got: \n${e.toString()}`);
          pushError(`Failed to fetch index information.`);
        }
        end();
        return;
      }

      logDebugMessage(`Total document count: ${totalDocCount}`);

      stateHandler.loaded(LOADED_FIELD_CANDIDATES, false);

      pushPingWithTimeout();

      push(
        updateLoadingStateAction({
          ccsWarning: false,
          loaded: stateHandler.loaded(),
          loadingState: i18n.translate(
            'xpack.aiops.logRateAnalysis.loadingState.identifiedFieldCandidates',
            {
              defaultMessage:
                'Identified {fieldCandidatesCount, plural, one {# field candidate} other {# field candidates}}.',
              values: {
                fieldCandidatesCount,
              },
            }
          ),
        })
      );

      if (fieldCandidatesCount === 0) {
        endWithUpdatedLoadingState();
      } else if (stateHandler.shouldStop()) {
        logDebugMessage('shouldStop after fetching field candidates.');
        end();
        return;
      }
    }

    return { fieldCandidates, textFieldCandidates };
  };
