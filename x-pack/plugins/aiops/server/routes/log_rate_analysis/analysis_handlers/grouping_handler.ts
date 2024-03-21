/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import {
  fetchHistogramsForFields,
  type SignificantItem,
  type SignificantItemGroup,
  type SignificantItemHistogramItem,
  type NumericChartData,
} from '@kbn/ml-agg-utils';
import { RANDOM_SAMPLER_SEED } from '@kbn/aiops-log-rate-analysis/constants';

import {
  addSignificantItemsGroupAction,
  addSignificantItemsGroupHistogramAction,
  updateLoadingStateAction,
} from '@kbn/aiops-log-rate-analysis/api/actions';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import { fetchFrequentItemSets } from '@kbn/aiops-log-rate-analysis/queries/fetch_frequent_item_sets';
import { fetchTerms2CategoriesCounts } from '@kbn/aiops-log-rate-analysis/queries/fetch_terms_2_categories_counts';
import { getGroupFilter } from '@kbn/aiops-log-rate-analysis/queries/get_group_filter';
import { getHistogramQuery } from '@kbn/aiops-log-rate-analysis/queries/get_histogram_query';
import { getSignificantItemGroups } from '@kbn/aiops-log-rate-analysis/queries/get_significant_item_groups';

import { MAX_CONCURRENT_QUERIES, PROGRESS_STEP_GROUPING } from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const groupingHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    client,
    requestBody,
    responseStream,
    logDebugMessage,
    logger,
    stateHandler,
    version,
  }: ResponseStreamFetchOptions<T>) =>
  async (
    significantCategories: SignificantItem[],
    significantTerms: SignificantItem[],
    overallTimeSeries?: NumericChartData
  ) => {
    logDebugMessage('Group results.');

    function pushHistogramDataLoadingState() {
      responseStream.push(
        updateLoadingStateAction({
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
      updateLoadingStateAction({
        ccsWarning: false,
        loaded: stateHandler.loaded(),
        loadingState: i18n.translate('xpack.aiops.logRateAnalysis.loadingState.groupingResults', {
          defaultMessage: 'Transforming significant field/value pairs into groups.',
        }),
        groupsMissing: true,
      })
    );

    try {
      const { fields, itemSets } = await fetchFrequentItemSets(
        client,
        requestBody.index,
        JSON.parse(requestBody.searchQuery) as estypes.QueryDslQueryContainer,
        significantTerms,
        requestBody.timeFieldName,
        requestBody.deviationMin,
        requestBody.deviationMax,
        logger,
        stateHandler.sampleProbability(),
        responseStream.pushError,
        abortSignal
      );

      if (significantCategories.length > 0 && significantTerms.length > 0) {
        const { fields: significantCategoriesFields, itemSets: significantCategoriesItemSets } =
          await fetchTerms2CategoriesCounts(
            client,
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
          responseStream.push(addSignificantItemsGroupAction(significantItemGroups, version));
        }

        stateHandler.loaded(PROGRESS_STEP_GROUPING, false);
        pushHistogramDataLoadingState();

        if (stateHandler.shouldStop()) {
          logDebugMessage('shouldStop after grouping.');
          responseStream.end();
          return;
        }

        logDebugMessage(`Fetch ${significantItemGroups.length} group histograms.`);

        const groupHistogramQueue = queue(async function (cpg: SignificantItemGroup) {
          if (stateHandler.shouldStop()) {
            logDebugMessage('shouldStop abort fetching group histograms.');
            groupHistogramQueue.kill();
            responseStream.end();
            return;
          }

          if (overallTimeSeries !== undefined) {
            const histogramQuery = getHistogramQuery(requestBody, getGroupFilter(cpg));

            let cpgTimeSeries: NumericChartData;
            try {
              cpgTimeSeries = (
                (await fetchHistogramsForFields(
                  client,
                  requestBody.index,
                  histogramQuery,
                  // fields
                  [
                    {
                      fieldName: requestBody.timeFieldName,
                      type: KBN_FIELD_TYPES.DATE,
                      interval: overallTimeSeries.interval,
                      min: overallTimeSeries.stats[0],
                      max: overallTimeSeries.stats[1],
                    },
                  ],
                  // samplerShardSize
                  -1,
                  undefined,
                  abortSignal,
                  stateHandler.sampleProbability(),
                  RANDOM_SAMPLER_SEED
                )) as [NumericChartData]
              )[0];
            } catch (e) {
              if (!isRequestAbortedError(e)) {
                logger.error(
                  `Failed to fetch the histogram data for group #${cpg.id}, got: \n${e.toString()}`
                );
                responseStream.pushError(
                  `Failed to fetch the histogram data for group #${cpg.id}.`
                );
              }
              return;
            }
            const histogram: SignificantItemHistogramItem[] =
              overallTimeSeries.data.map((o) => {
                const current = cpgTimeSeries.data.find(
                  (d1) => d1.key_as_string === o.key_as_string
                ) ?? {
                  doc_count: 0,
                };

                if (version === '1') {
                  return {
                    key: o.key,
                    key_as_string: o.key_as_string ?? '',
                    doc_count_significant_term: current.doc_count,
                    doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                  };
                }

                return {
                  key: o.key,
                  key_as_string: o.key_as_string ?? '',
                  doc_count_significant_item: current.doc_count,
                  doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                };
              }) ?? [];

            responseStream.push(
              addSignificantItemsGroupHistogramAction(
                [
                  {
                    id: cpg.id,
                    histogram,
                  },
                ],
                version
              )
            );
          }
        }, MAX_CONCURRENT_QUERIES);

        groupHistogramQueue.push(significantItemGroups);
        await groupHistogramQueue.drain();
      }
    } catch (e) {
      if (!isRequestAbortedError(e)) {
        logger.error(`Failed to transform field/value pairs into groups, got: \n${e.toString()}`);
        responseStream.pushError(`Failed to transform field/value pairs into groups.`);
      }
    }
  };
