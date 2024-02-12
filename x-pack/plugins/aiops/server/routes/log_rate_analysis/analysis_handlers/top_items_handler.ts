/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';

import { SIGNIFICANT_ITEM_TYPE, type SignificantItem } from '@kbn/ml-agg-utils';
import { i18n } from '@kbn/i18n';

import {
  addSignificantItemsAction,
  updateLoadingStateAction,
} from '../../../../common/api/log_rate_analysis/actions';

import { isRequestAbortedError } from '../../../lib/is_request_aborted_error';

import { fetchTopCategories } from '../queries/fetch_top_categories';
import { fetchTopTerms } from '../queries/fetch_top_terms';

import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../../common/api/log_rate_analysis/schema';

import {
  LOADED_FIELD_CANDIDATES,
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_P_VALUES,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const topItemsHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    client,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
    version,
  }: ResponseStreamFetchOptions<T>) =>
  async ({
    fieldCandidates,
    textFieldCandidates,
  }: {
    fieldCandidates: string[];
    textFieldCandidates: string[];
  }) => {
    let fieldCandidatesCount = fieldCandidates.length;

    // This will store the combined count of detected log patterns and keywords
    let fieldValuePairsCount = 0;

    const topCategories: SignificantItem[] = [];

    if (version === '1') {
      topCategories.push(
        ...((requestBody as AiopsLogRateAnalysisSchema<'1'>).overrides?.significantTerms?.filter(
          (d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN
        ) ?? [])
      );
    }

    if (version === '2') {
      topCategories.push(
        ...((requestBody as AiopsLogRateAnalysisSchema<'2'>).overrides?.significantItems?.filter(
          (d) => d.type === SIGNIFICANT_ITEM_TYPE.LOG_PATTERN
        ) ?? [])
      );
    }

    // Get categories of text fields
    if (textFieldCandidates.length > 0) {
      topCategories.push(
        ...(await fetchTopCategories(
          client,
          requestBody,
          textFieldCandidates,
          logger,
          stateHandler.sampleProbability(),
          responseStream.pushError,
          abortSignal
        ))
      );

      if (topCategories.length > 0) {
        responseStream.push(addSignificantItemsAction(topCategories, version));
      }
    }

    const topTerms: SignificantItem[] = [];

    if (version === '1') {
      topTerms.push(
        ...((requestBody as AiopsLogRateAnalysisSchema<'1'>).overrides?.significantTerms?.filter(
          (d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD
        ) ?? [])
      );
    }

    if (version === '2') {
      topTerms.push(
        ...((requestBody as AiopsLogRateAnalysisSchema<'2'>).overrides?.significantItems?.filter(
          (d) => d.type === SIGNIFICANT_ITEM_TYPE.KEYWORD
        ) ?? [])
      );
    }

    const fieldsToSample = new Set<string>();

    let remainingFieldCandidates: string[];
    let loadingStepSizeTopTerms = PROGRESS_STEP_P_VALUES;

    if (requestBody.overrides?.remainingFieldCandidates) {
      fieldCandidates.push(...requestBody.overrides?.remainingFieldCandidates);
      remainingFieldCandidates = requestBody.overrides?.remainingFieldCandidates;
      fieldCandidatesCount = fieldCandidates.length;
      loadingStepSizeTopTerms =
        LOADED_FIELD_CANDIDATES +
        PROGRESS_STEP_P_VALUES -
        (requestBody.overrides?.loaded ?? PROGRESS_STEP_P_VALUES);
    } else {
      remainingFieldCandidates = fieldCandidates;
    }

    logDebugMessage('Fetch p-values.');

    const topTermsQueue = queue(async function (fieldCandidate: string) {
      stateHandler.loaded((1 / fieldCandidatesCount) * loadingStepSizeTopTerms, false);

      let fetchedTopTerms: Awaited<ReturnType<typeof fetchTopTerms>>;

      try {
        fetchedTopTerms = await fetchTopTerms(
          client,
          requestBody,
          [fieldCandidate],
          logger,
          stateHandler.sampleProbability(),
          responseStream.pushError,
          abortSignal
        );
      } catch (e) {
        if (!isRequestAbortedError(e)) {
          logger.error(`Failed to fetch p-values for '${fieldCandidate}', got: \n${e.toString()}`);
          responseStream.pushError(`Failed to fetch p-values for '${fieldCandidate}'.`);
        }
        return;
      }

      remainingFieldCandidates = remainingFieldCandidates.filter((d) => d !== fieldCandidate);

      if (fetchedTopTerms.length > 0) {
        fetchedTopTerms.forEach((d) => {
          fieldsToSample.add(d.fieldName);
        });
        topTerms.push(...fetchedTopTerms);

        responseStream.push(addSignificantItemsAction(fetchedTopTerms, version));
      }

      responseStream.push(
        updateLoadingStateAction({
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

    topTermsQueue.push(fieldCandidates, (err) => {
      if (err) {
        logger.error(`Failed to fetch p-values.', got: \n${err.toString()}`);
        responseStream.pushError(`Failed to fetch p-values.`);
        topTermsQueue.kill();
        responseStream.end();
      } else if (stateHandler.shouldStop()) {
        logDebugMessage('shouldStop fetching p-values.');
        topTermsQueue.kill();
        responseStream.end();
      }
    });
    await topTermsQueue.drain();

    fieldValuePairsCount = topCategories.length + topTerms.length;

    if (fieldValuePairsCount === 0) {
      logDebugMessage('Stopping analysis, did not find any categories or terms.');
      responseStream.endWithUpdatedLoadingState();
      return;
    }

    return {
      fieldValuePairsCount,
      significantCategories: topCategories,
      significantTerms: topTerms,
    };
  };
