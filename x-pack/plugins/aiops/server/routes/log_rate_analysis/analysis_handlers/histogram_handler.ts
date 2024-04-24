/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type {
  SignificantItem,
  SignificantItemHistogramItem,
  NumericChartData,
} from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';
import { RANDOM_SAMPLER_SEED } from '@kbn/aiops-log-rate-analysis/constants';

import {
  addSignificantItemsHistogram,
  updateLoadingState,
} from '@kbn/aiops-log-rate-analysis/api/stream_reducer';
import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from '@kbn/aiops-log-rate-analysis/api/schema';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';

import { getHistogramQuery } from '@kbn/aiops-log-rate-analysis/queries/get_histogram_query';

import {
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_HISTOGRAMS,
} from '../response_stream_utils/constants';
import type { ResponseStreamFetchOptions } from '../response_stream_factory';

export const histogramHandlerFactory =
  <T extends ApiVersion>({
    abortSignal,
    client,
    logDebugMessage,
    logger,
    requestBody,
    responseStream,
    stateHandler,
  }: ResponseStreamFetchOptions<T>) =>
  async (
    fieldValuePairsCount: number,
    significantCategories: SignificantItem[],
    significantTerms: SignificantItem[],
    overallTimeSeries?: NumericChartData
  ) => {
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

    logDebugMessage(`Fetch ${significantTerms.length} field/value histograms.`);

    // time series filtered by fields
    if (
      significantTerms.length > 0 &&
      overallTimeSeries !== undefined &&
      !requestBody.overrides?.regroupOnly
    ) {
      const fieldValueHistogramQueue = queue(async function (cp: SignificantItem) {
        if (stateHandler.shouldStop()) {
          logDebugMessage('shouldStop abort fetching field/value histograms.');
          fieldValueHistogramQueue.kill();
          responseStream.end();
          return;
        }

        if (overallTimeSeries !== undefined) {
          const histogramQuery = getHistogramQuery(requestBody, [
            {
              term: { [cp.fieldName]: cp.fieldValue },
            },
          ]);

          let cpTimeSeries: NumericChartData;

          try {
            cpTimeSeries = (
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
            logger.error(
              `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${
                cp.fieldValue
              }", got: \n${e.toString()}`
            );
            responseStream.pushError(
              `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${cp.fieldValue}".`
            );
            return;
          }

          const histogram: SignificantItemHistogramItem[] =
            overallTimeSeries.data.map((o) => {
              const current = cpTimeSeries.data.find(
                (d1) => d1.key_as_string === o.key_as_string
              ) ?? {
                doc_count: 0,
              };

              return {
                key: o.key,
                key_as_string: o.key_as_string ?? '',
                doc_count_significant_item: current.doc_count,
                doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
              };
            }) ?? [];

          const { fieldName, fieldValue } = cp;

          stateHandler.loaded((1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS, false);
          pushHistogramDataLoadingState();
          responseStream.push(
            addSignificantItemsHistogram([
              {
                fieldName,
                fieldValue,
                histogram,
              },
            ])
          );
        }
      }, MAX_CONCURRENT_QUERIES);

      await fieldValueHistogramQueue.push(significantTerms);
      await fieldValueHistogramQueue.drain();
    }

    // histograms for text field patterns
    if (
      overallTimeSeries !== undefined &&
      significantCategories.length > 0 &&
      !requestBody.overrides?.regroupOnly
    ) {
      const significantCategoriesHistogramQueries = significantCategories.map((d) => {
        const histogramQuery = getHistogramQuery(requestBody);
        const categoryQuery = getCategoryQuery(d.fieldName, [
          { key: `${d.key}`, count: d.doc_count, examples: [], regex: '' },
        ]);
        if (Array.isArray(histogramQuery.bool?.filter)) {
          histogramQuery.bool?.filter?.push(categoryQuery);
        }
        return histogramQuery;
      });

      for (const [i, histogramQuery] of significantCategoriesHistogramQueries.entries()) {
        const cp = significantCategories[i];
        let catTimeSeries: NumericChartData;

        try {
          catTimeSeries = (
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
          logger.error(
            `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${
              cp.fieldValue
            }", got: \n${e.toString()}`
          );
          responseStream.pushError(
            `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${cp.fieldValue}".`
          );
          return;
        }

        const histogram: SignificantItemHistogramItem[] =
          overallTimeSeries.data.map((o) => {
            const current = catTimeSeries.data.find(
              (d1) => d1.key_as_string === o.key_as_string
            ) ?? {
              doc_count: 0,
            };

            return {
              key: o.key,
              key_as_string: o.key_as_string ?? '',
              doc_count_significant_item: current.doc_count,
              doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
            };
          }) ?? [];

        const { fieldName, fieldValue } = cp;

        stateHandler.loaded((1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS, false);
        pushHistogramDataLoadingState();
        responseStream.push(
          addSignificantItemsHistogram([
            {
              fieldName,
              fieldValue,
              histogram,
            },
          ])
        );
      }
    }
  };
