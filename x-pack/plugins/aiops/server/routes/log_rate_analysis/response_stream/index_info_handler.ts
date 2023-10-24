/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import {
  updateLoadingStateAction,
  type AiopsLogRateAnalysisSchema,
} from '../../../../common/api/log_rate_analysis';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { fetchIndexInfo } from '../queries/fetch_index_info';

import { LOADED_FIELD_CANDIDATES } from './constants';
import type { StreamLoaded } from './loaded';
import type { LogDebugMessage, StreamPush } from './types';

export const indexInfoHandlerFactory =
  (
    client: ElasticsearchClient,
    abortSignal: AbortSignal,
    params: AiopsLogRateAnalysisSchema,
    logger: Logger,
    logDebugMessage: LogDebugMessage,
    end: () => void,
    endWithUpdatedLoadingState: () => void,
    push: StreamPush,
    pushPingWithTimeout: () => void,
    pushError: (msg: string) => void,
    loaded: StreamLoaded,
    shouldStop: (d?: boolean) => boolean | undefined
  ) =>
  async () => {
    const fieldCandidates: string[] = [];
    let fieldCandidatesCount = fieldCandidates.length;

    const textFieldCandidates: string[] = [];

    let totalDocCount = 0;

    if (!params.overrides?.remainingFieldCandidates) {
      logDebugMessage('Fetch index information.');
      push(
        updateLoadingStateAction({
          ccsWarning: false,
          loaded: loaded(),
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
          params,
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

      loaded(LOADED_FIELD_CANDIDATES, false);

      pushPingWithTimeout();

      push(
        updateLoadingStateAction({
          ccsWarning: false,
          loaded: loaded(),
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
      } else if (shouldStop()) {
        logDebugMessage('shouldStop after fetching field candidates.');
        end();
        return;
      }

      return { fieldCandidates, fieldCandidatesCount, textFieldCandidates, totalDocCount };
    }
  };
