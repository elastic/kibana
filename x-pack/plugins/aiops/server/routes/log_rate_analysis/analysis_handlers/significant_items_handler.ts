/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';
import { chunk } from 'lodash';

import { SIGNIFICANT_ITEM_TYPE, type SignificantItem } from '@kbn/ml-agg-utils';
import { i18n } from '@kbn/i18n';
import {
  addSignificantItems,
  updateLoadingState,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import type { QueueFieldCandidate } from '@kbn/aiops-log-rate-analysis/queue_field_candidates';
import {
  isKeywordFieldCandidates,
  isTextFieldCandidates,
  QUEUE_CHUNKING_SIZE,
} from '@kbn/aiops-log-rate-analysis/queue_field_candidates';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { fetchSignificantCategories } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_categories';
import { fetchSignificantTermPValues } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_term_p_values';

import {
  LOADED_FIELD_CANDIDATES,
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_P_VALUES,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const significantItemsHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
    version,
  }: ResponseStreamFetchOptions<T>) =>
  async ({
    keywordFieldCandidates,
    textFieldCandidates,
  }: {
    keywordFieldCandidates: string[];
    textFieldCandidates: string[];
  }) => {
    let keywordFieldCandidatesCount = keywordFieldCandidates.length;
    const textFieldCandidatesCount = textFieldCandidates.length;

    // This will store the combined count of detected significant log patterns and keywords
    let fieldValuePairsCount = 0;

    const significantCategories: SignificantItem[] = [];

    significantCategories.push(
      ...((requestBody as AiopsLogRateAnalysisSchema<'3'>).overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN
      ) ?? [])
    );

    const significantTerms: SignificantItem[] = [];

    significantTerms.push(
      ...((requestBody as AiopsLogRateAnalysisSchema<'3'>).overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD
      ) ?? [])
    );

    let remainingKeywordFieldCandidates: string[];
    let remainingTextFieldCandidates: string[];
    let loadingStepSizePValues: number;

    if (requestBody.overrides?.loaded) {
      loadingStepSizePValues =
        LOADED_FIELD_CANDIDATES + PROGRESS_STEP_P_VALUES - requestBody.overrides?.loaded;
    } else {
      loadingStepSizePValues = LOADED_FIELD_CANDIDATES;
    }

    if (version === '2') {
      const overridesRemainingFieldCandidates = (requestBody as AiopsLogRateAnalysisSchema<'2'>)
        .overrides?.remainingFieldCandidates;

      if (Array.isArray(overridesRemainingFieldCandidates)) {
        keywordFieldCandidates.push(...overridesRemainingFieldCandidates);
        remainingKeywordFieldCandidates = overridesRemainingFieldCandidates;
        keywordFieldCandidatesCount = keywordFieldCandidates.length;
      } else {
        remainingKeywordFieldCandidates = keywordFieldCandidates;
      }

      remainingTextFieldCandidates = textFieldCandidates;
    } else if (version === '3') {
      const overridesRemainingKeywordFieldCandidates = (
        requestBody as AiopsLogRateAnalysisSchema<'3'>
      ).overrides?.remainingKeywordFieldCandidates;

      if (Array.isArray(overridesRemainingKeywordFieldCandidates)) {
        keywordFieldCandidates.push(...overridesRemainingKeywordFieldCandidates);
        remainingKeywordFieldCandidates = overridesRemainingKeywordFieldCandidates;
        keywordFieldCandidatesCount = keywordFieldCandidates.length;
      } else {
        remainingKeywordFieldCandidates = keywordFieldCandidates;
      }

      const overridesRemainingTextFieldCandidates = (requestBody as AiopsLogRateAnalysisSchema<'3'>)
        .overrides?.remainingTextFieldCandidates;

      if (Array.isArray(overridesRemainingTextFieldCandidates)) {
        textFieldCandidates.push(...overridesRemainingTextFieldCandidates);
        remainingTextFieldCandidates = overridesRemainingTextFieldCandidates;
      } else {
        remainingTextFieldCandidates = textFieldCandidates;
      }
    }

    logDebugMessage('Fetch p-values.');

    const loadingStep =
      (1 / (keywordFieldCandidatesCount + textFieldCandidatesCount)) * loadingStepSizePValues;

    const pValuesQueue = queue(async function (payload: QueueFieldCandidate) {
      let queueItemLoadingStep = 0;

      if (isKeywordFieldCandidates(payload)) {
        const { keywordFieldCandidates: fieldNames } = payload;
        queueItemLoadingStep = loadingStep * fieldNames.length;
        let pValues: Awaited<ReturnType<typeof fetchSignificantTermPValues>>;

        try {
          pValues = await fetchSignificantTermPValues({
            esClient,
            abortSignal,
            logger,
            emitError: responseStream.pushError,
            arguments: {
              ...requestBody,
              fieldNames,
              sampleProbability: stateHandler.sampleProbability(),
            },
          });
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(
              `Failed to fetch p-values for ${fieldNames.join()}, got: \n${e.toString()}`
            );
            responseStream.pushError(`Failed to fetch p-values for ${fieldNames.join()}.`);
          }
          return;
        }

        remainingKeywordFieldCandidates = remainingKeywordFieldCandidates.filter(
          (d) => !fieldNames.includes(d)
        );

        if (pValues.length > 0) {
          significantTerms.push(...pValues);
          responseStream.push(addSignificantItems(pValues));
          fieldValuePairsCount += pValues.length;
        }
      } else if (isTextFieldCandidates(payload)) {
        const { textFieldCandidates: fieldNames } = payload;
        queueItemLoadingStep = loadingStep * fieldNames.length;

        let significantCategoriesForField: Awaited<ReturnType<typeof fetchSignificantCategories>>;

        try {
          significantCategoriesForField = await fetchSignificantCategories({
            esClient,
            logger,
            emitError: responseStream.pushError,
            abortSignal,
            arguments: {
              ...requestBody,
              fieldNames,
              sampleProbability: stateHandler.sampleProbability(),
            },
          });
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(
              `Failed to fetch p-values for ${fieldNames.join()}, got: \n${e.toString()}`
            );
            responseStream.pushError(`Failed to fetch p-values for ${fieldNames.join()}.`);
          }
          return;
        }

        remainingTextFieldCandidates = remainingTextFieldCandidates.filter(
          (d) => !fieldNames.includes(d)
        );

        if (significantCategoriesForField.length > 0) {
          significantCategories.push(...significantCategoriesForField);
          responseStream.push(addSignificantItems(significantCategoriesForField));
          fieldValuePairsCount += significantCategoriesForField.length;
        }
      }

      stateHandler.loaded(queueItemLoadingStep, false);

      responseStream.push(
        updateLoadingState({
          ccsWarning: false,
          loaded: stateHandler.loaded(),
          loadingState: i18n.translate(
            'xpack.aiops.logRateAnalysis.loadingState.identifiedFieldValuePairs',
            {
              defaultMessage:
                'Identified {fieldValuePairsCount, plural, one {# significant field/value pair} other {# significant field/value pairs}}.',
              values: {
                fieldValuePairsCount,
              },
            }
          ),
          remainingKeywordFieldCandidates,
          remainingTextFieldCandidates,
        })
      );
    }, MAX_CONCURRENT_QUERIES);

    // This chunks keyword and text field candidates, then passes them on
    // to the async queue for processing. Each chunk will be part of a single
    // query using multiple aggs for each candidate. For many candidates,
    // on top of that the async queue will process multiple queries concurrently.
    pValuesQueue.push(
      [
        ...chunk(textFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({ textFieldCandidates: d })),
        ...chunk(keywordFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({
          keywordFieldCandidates: d,
        })),
      ],
      (err) => {
        if (err) {
          logger.error(`Failed to fetch p-values.', got: \n${err.toString()}`);
          responseStream.pushError(`Failed to fetch p-values.`);
          pValuesQueue.kill();
          responseStream.end();
        } else if (stateHandler.shouldStop()) {
          logDebugMessage('shouldStop fetching p-values.');
          pValuesQueue.kill();
          responseStream.end();
        }
      }
    );
    await pValuesQueue.drain();

    fieldValuePairsCount = significantCategories.length + significantTerms.length;

    if (fieldValuePairsCount === 0) {
      logDebugMessage('Stopping analysis, did not find significant terms.');
      responseStream.endWithUpdatedLoadingState();
      return;
    }

    return { fieldValuePairsCount, significantCategories, significantTerms };
  };
