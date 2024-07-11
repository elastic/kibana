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
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { fetchSignificantCategories } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_categories';
import { fetchSignificantTermPValues } from '@kbn/aiops-log-rate-analysis/queries/fetch_significant_term_p_values';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import {
  LOADED_FIELD_CANDIDATES,
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_P_VALUES,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

interface FieldCandidates {
  fieldCandidates: string[];
}
const isFieldCandidates = (d: unknown): d is FieldCandidates =>
  isPopulatedObject(d, ['fieldCandidates']);

interface TextFieldCandidates {
  textFieldCandidates: string[];
}
const isTextFieldCandidates = (d: unknown): d is FieldCandidates =>
  isPopulatedObject(d, ['textFieldCandidates']);

type Candidate = FieldCandidates | TextFieldCandidates;

export const significantItemsHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async ({
    fieldCandidates,
    textFieldCandidates,
  }: {
    fieldCandidates: string[];
    textFieldCandidates: string[];
  }) => {
    let fieldCandidatesCount = fieldCandidates.length;
    const textFieldCandidatesCount = textFieldCandidates.length;

    // This will store the combined count of detected significant log patterns and keywords
    let fieldValuePairsCount = 0;

    const significantCategories: SignificantItem[] = [];

    significantCategories.push(
      ...((requestBody as AiopsLogRateAnalysisSchema<'2'>).overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN
      ) ?? [])
    );

    const significantTerms: SignificantItem[] = [];

    significantTerms.push(
      ...((requestBody as AiopsLogRateAnalysisSchema<'2'>).overrides?.significantItems?.filter(
        (d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD
      ) ?? [])
    );

    const fieldsToSample = new Set<string>();

    let remainingFieldCandidates: string[];
    let loadingStepSizePValues = PROGRESS_STEP_P_VALUES;

    if (requestBody.overrides?.remainingFieldCandidates) {
      fieldCandidates.push(...requestBody.overrides?.remainingFieldCandidates);
      remainingFieldCandidates = requestBody.overrides?.remainingFieldCandidates;
      fieldCandidatesCount = fieldCandidates.length;
      loadingStepSizePValues =
        LOADED_FIELD_CANDIDATES +
        PROGRESS_STEP_P_VALUES -
        (requestBody.overrides?.loaded ?? PROGRESS_STEP_P_VALUES);
    } else {
      remainingFieldCandidates = fieldCandidates;
    }

    logDebugMessage('Fetch p-values.');

    const chunkingSize = 50;
    const loadingStep =
      (1 / (fieldCandidatesCount + textFieldCandidatesCount)) *
      loadingStepSizePValues *
      chunkingSize;

    const pValuesQueue = queue(async function (payload: Candidate) {
      if (isFieldCandidates(payload)) {
        const { fieldCandidates: fieldNames } = payload;
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

        remainingFieldCandidates = remainingFieldCandidates.filter((d) => !fieldNames.includes(d));

        if (pValues.length > 0) {
          pValues.forEach((d) => {
            fieldsToSample.add(d.fieldName);
          });
          significantTerms.push(...pValues);

          responseStream.push(addSignificantItems(pValues));

          fieldValuePairsCount += pValues.length;
        }
      } else if (isTextFieldCandidates(payload)) {
        const { textFieldCandidates: fieldNames } = payload;

        const significantCategoriesForField = await fetchSignificantCategories({
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

        if (significantCategoriesForField.length > 0) {
          significantCategories.push(...significantCategoriesForField);
          responseStream.push(addSignificantItems(significantCategoriesForField));
          fieldValuePairsCount += significantCategoriesForField.length;
        }
      }

      stateHandler.loaded(loadingStep, false);

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
          remainingFieldCandidates,
        })
      );
    }, MAX_CONCURRENT_QUERIES);

    const textFieldCandidatesChunks = chunk(textFieldCandidates, chunkingSize);
    const fieldCandidatesChunks = chunk(fieldCandidates, chunkingSize);

    pValuesQueue.push(
      [
        ...textFieldCandidatesChunks.map((d) => ({ textFieldCandidates: d })),
        ...fieldCandidatesChunks.map((d) => ({ fieldCandidates: d })),
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
