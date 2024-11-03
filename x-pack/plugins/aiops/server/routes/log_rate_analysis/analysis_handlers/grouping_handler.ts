/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { queue } from 'async';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { i18n } from '@kbn/i18n';
import type {
  SignificantItem,
  SignificantItemGroup,
  SignificantItemGroupHistogram,
  NumericChartData,
} from '@kbn/ml-agg-utils';
import { QUEUE_CHUNKING_SIZE } from '@kbn/aiops-log-rate-analysis/queue_field_candidates';
import {
  addSignificantItemsGroup,
  addSignificantItemsGroupHistogram,
  updateLoadingState,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';
import { fetchFrequentItemSets } from '@kbn/aiops-log-rate-analysis/queries/fetch_frequent_item_sets';
import { fetchTerms2CategoriesCounts } from '@kbn/aiops-log-rate-analysis/queries/fetch_terms_2_categories_counts';
import { getSignificantItemGroups } from '@kbn/aiops-log-rate-analysis/queries/get_significant_item_groups';
import { fetchMiniHistogramsForSignificantGroups } from '@kbn/aiops-log-rate-analysis/queries/fetch_mini_histograms_for_significant_groups';

import {
  MAX_CONCURRENT_QUERIES,
  LOADED_FIELD_CANDIDATES,
  PROGRESS_STEP_P_VALUES,
  PROGRESS_STEP_GROUPING,
  PROGRESS_STEP_HISTOGRAMS,
  PROGRESS_STEP_HISTOGRAMS_GROUPS,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const groupingHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    esClient,
    requestBody,
    responseStream,
    logDebugMessage,
    logger,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async (
    significantCategories: SignificantItem[],
    significantTerms: SignificantItem[],
    overallTimeSeries?: NumericChartData['data']
  ) => {
    logDebugMessage('Group results.');

    function pushHistogramDataLoadingState() {
      responseStream.push(
        updateLoadingState({
          ccsWarning: false,
          loaded: stateHandler.loaded(),
          loadingState: i18n.translate(
            'xpack.aiops.logRateAnalysis.loadingState.loadingHistogramData',
            {
              defaultMessage: 'Loading histogram data.',
            }
          ),
        })
      );
    }

    responseStream.push(
      updateLoadingState({
        ccsWarning: false,
        loaded: stateHandler.loaded(),
        loadingState: i18n.translate('xpack.aiops.logRateAnalysis.loadingState.groupingResults', {
          defaultMessage: 'Transforming significant field/value pairs into groups.',
        }),
        groupsMissing: true,
      })
    );

    try {
      const { fields, itemSets } = await fetchFrequentItemSets({
        esClient,
        logger,
        emitError: responseStream.pushError,
        abortSignal,
        arguments: {
          index: requestBody.index,
          searchQuery: JSON.parse(requestBody.searchQuery) as estypes.QueryDslQueryContainer,
          significantItems: significantTerms,
          timeFieldName: requestBody.timeFieldName,
          deviationMin: requestBody.deviationMin,
          deviationMax: requestBody.deviationMax,
          sampleProbability: stateHandler.sampleProbability(),
        },
      });

      if (significantCategories.length > 0 && significantTerms.length > 0) {
        const { fields: significantCategoriesFields, itemSets: significantCategoriesItemSets } =
          await fetchTerms2CategoriesCounts(
            esClient,
            requestBody,
            JSON.parse(requestBody.searchQuery) as estypes.QueryDslQueryContainer,
            significantTerms,
            itemSets,
            significantCategories,
            requestBody.deviationMin,
            requestBody.deviationMax,
            logger,
            responseStream.pushError,
            abortSignal
          );

        fields.push(...significantCategoriesFields);
        itemSets.push(...significantCategoriesItemSets);
      }

      if (stateHandler.shouldStop()) {
        logDebugMessage('shouldStop after fetching frequent_item_sets.');
        responseStream.end();
        return;
      }

      if (fields.length > 0 && itemSets.length > 0) {
        const significantItemGroups = getSignificantItemGroups(
          itemSets,
          [...significantTerms, ...significantCategories],
          fields
        );

        // We'll find out if there's at least one group with at least two items,
        // only then will we return the groups to the clients and make the grouping option available.
        const maxItems = Math.max(...significantItemGroups.map((g) => g.group.length));

        if (maxItems > 1) {
          responseStream.push(addSignificantItemsGroup(significantItemGroups));
        }

        stateHandler.loaded(
          LOADED_FIELD_CANDIDATES +
            PROGRESS_STEP_P_VALUES +
            PROGRESS_STEP_HISTOGRAMS +
            PROGRESS_STEP_GROUPING
        );
        pushHistogramDataLoadingState();

        if (stateHandler.shouldStop()) {
          logDebugMessage('shouldStop after grouping.');
          responseStream.end();
          return;
        }

        logDebugMessage(`Fetch ${significantItemGroups.length} group histograms.`);

        const groupHistogramQueueChunks = chunk(significantItemGroups, QUEUE_CHUNKING_SIZE);
        const loadingStepSize =
          (1 / groupHistogramQueueChunks.length) * PROGRESS_STEP_HISTOGRAMS_GROUPS;

        const groupHistogramQueue = queue(async function (payload: SignificantItemGroup[]) {
          if (stateHandler.shouldStop()) {
            logDebugMessage('shouldStop abort fetching group histograms.');
            groupHistogramQueue.kill();
            responseStream.end();
            return;
          }

          if (overallTimeSeries !== undefined) {
            let histograms: SignificantItemGroupHistogram[];

            try {
              histograms = await fetchMiniHistogramsForSignificantGroups(
                esClient,
                requestBody,
                payload,
                overallTimeSeries,
                logger,
                stateHandler.sampleProbability(),
                () => {},
                abortSignal
              );
            } catch (e) {
              logger.error(
                `Failed to fetch the histogram data chunk for groups, got: \n${e.toString()}`
              );
              responseStream.pushError(`Failed to fetch the histogram data chunk for groups.`);
              return;
            }

            stateHandler.loaded(loadingStepSize, false);
            pushHistogramDataLoadingState();
            responseStream.push(addSignificantItemsGroupHistogram(histograms));
          }
        }, MAX_CONCURRENT_QUERIES);

        await groupHistogramQueue.push(groupHistogramQueueChunks);
        await groupHistogramQueue.drain();
      }
    } catch (e) {
      if (!isRequestAbortedError(e)) {
        logger.error(`Failed to transform field/value pairs into groups, got: \n${e.toString()}`);
        responseStream.pushError(`Failed to transform field/value pairs into groups.`);
      }
    }
  };
