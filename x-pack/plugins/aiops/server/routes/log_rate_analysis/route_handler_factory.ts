/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  CoreStart,
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type {
  SignificantItem,
  SignificantItemGroup,
  SignificantItemHistogramItem,
  NumericChartData,
  NumericHistogramField,
} from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';
import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { RANDOM_SAMPLER_SEED, AIOPS_TELEMETRY_ID } from '../../../common/constants';
import {
  addSignificantItemsGroupAction,
  addSignificantItemsGroupHistogramAction,
  addSignificantItemsHistogramAction,
  updateLoadingStateAction,
} from '../../../common/api/log_rate_analysis/actions';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '../../../common/api/log_rate_analysis/schema';
import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';
import { AIOPS_API_ENDPOINT } from '../../../common/api';

import { PLUGIN_ID } from '../../../common';

import { isRequestAbortedError } from '../../lib/is_request_aborted_error';
import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsLicense } from '../../types';

import { fetchFrequentItemSets } from './queries/fetch_frequent_item_sets';
import { fetchTerms2CategoriesCounts } from './queries/fetch_terms_2_categories_counts';
import { getHistogramQuery } from './queries/get_histogram_query';
import { getGroupFilter } from './queries/get_group_filter';
import { getSignificantItemGroups } from './queries/get_significant_item_groups';
import { logRateAnalysisResponseStreamFactory } from './response_stream/log_rate_analysis_response_stream';
import {
  MAX_CONCURRENT_QUERIES,
  PROGRESS_STEP_GROUPING,
  PROGRESS_STEP_HISTOGRAMS,
  PROGRESS_STEP_HISTOGRAMS_GROUPS,
} from './response_stream/constants';

export function routeHandlerFactory<T extends ApiVersion>(
  version: T,
  license: AiopsLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema<T>> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema<T>>,
    response: KibanaResponseFactory
  ) => {
    const { headers } = request;

    trackAIOpsRouteUsage(
      `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`,
      headers[AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN],
      usageCounter
    );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    const client = (await context.core).elasticsearch.client.asCurrentUser;
    const executionContext = createExecutionContext(coreStart, PLUGIN_ID, request.route.path);

    return await coreStart.executionContext.withContext(executionContext, () => {
      const groupingEnabled = !!request.body.grouping;

      const {
        abortSignal,
        end,
        endWithUpdatedLoadingState,
        indexInfoHandler,
        isRunning,
        loaded,
        logDebugMessage,
        overridesHandler,
        push,
        pushError,
        pushPingWithTimeout,
        responseWithHeaders,
        sampleProbability,
        significantItemsHandler,
        shouldStop,
      } = logRateAnalysisResponseStreamFactory<T>({
        version,
        client,
        requestBody: request.body,
        events: request.events,
        headers: request.headers,
        logger,
      });

      async function runAnalysis() {
        try {
          logDebugMessage('Starting analysis.');
          logDebugMessage(`Sample probability: ${sampleProbability}`);

          isRunning(true);
          overridesHandler();
          pushPingWithTimeout();

          // Step 1: Index Info: Field candidates, total doc count, sample probability
          const indexInfo = await indexInfoHandler();
          if (!indexInfo) {
            return;
          }

          // Step 2: Significant categories and terms
          const significantItemsObj = await significantItemsHandler(indexInfo);
          if (!significantItemsObj) {
            return;
          }

          const { fieldValuePairsCount, significantCategories, significantTerms } =
            significantItemsObj;

          const histogramFields: [NumericHistogramField] = [
            { fieldName: request.body.timeFieldName, type: KBN_FIELD_TYPES.DATE },
          ];

          logDebugMessage('Fetch overall histogram.');

          let overallTimeSeries: NumericChartData | undefined;

          const overallHistogramQuery = getHistogramQuery(request.body);

          try {
            overallTimeSeries = (
              (await fetchHistogramsForFields(
                client,
                request.body.index,
                overallHistogramQuery,
                // fields
                histogramFields,
                // samplerShardSize
                -1,
                undefined,
                abortSignal,
                sampleProbability,
                RANDOM_SAMPLER_SEED
              )) as [NumericChartData]
            )[0];
          } catch (e) {
            if (!isRequestAbortedError(e)) {
              logger.error(`Failed to fetch the overall histogram data, got: \n${e.toString()}`);
              pushError(`Failed to fetch overall histogram data.`);
            }
            // Still continue the analysis even if loading the overall histogram fails.
          }

          function pushHistogramDataLoadingState() {
            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded: loaded(),
                loadingState: i18n.translate(
                  'xpack.aiops.logRateAnalysis.loadingState.loadingHistogramData',
                  {
                    defaultMessage: 'Loading histogram data.',
                  }
                ),
              })
            );
          }

          if (shouldStop()) {
            logDebugMessage('shouldStop after fetching overall histogram.');
            end();
            return;
          }

          if (groupingEnabled) {
            logDebugMessage('Group results.');

            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded: loaded(),
                loadingState: i18n.translate(
                  'xpack.aiops.logRateAnalysis.loadingState.groupingResults',
                  {
                    defaultMessage: 'Transforming significant field/value pairs into groups.',
                  }
                ),
                groupsMissing: true,
              })
            );

            try {
              const { fields, itemSets } = await fetchFrequentItemSets(
                client,
                request.body.index,
                JSON.parse(request.body.searchQuery) as estypes.QueryDslQueryContainer,
                significantTerms,
                request.body.timeFieldName,
                request.body.deviationMin,
                request.body.deviationMax,
                logger,
                sampleProbability,
                pushError,
                abortSignal
              );

              if (significantCategories.length > 0 && significantTerms.length > 0) {
                const {
                  fields: significantCategoriesFields,
                  itemSets: significantCategoriesItemSets,
                } = await fetchTerms2CategoriesCounts(
                  client,
                  request.body,
                  JSON.parse(request.body.searchQuery) as estypes.QueryDslQueryContainer,
                  significantTerms,
                  itemSets,
                  significantCategories,
                  request.body.deviationMin,
                  request.body.deviationMax,
                  logger,
                  pushError,
                  abortSignal
                );

                fields.push(...significantCategoriesFields);
                itemSets.push(...significantCategoriesItemSets);
              }

              if (shouldStop()) {
                logDebugMessage('shouldStop after fetching frequent_item_sets.');
                end();
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
                  push(addSignificantItemsGroupAction(significantItemGroups, version));
                }

                loaded(PROGRESS_STEP_GROUPING, false);
                pushHistogramDataLoadingState();

                if (shouldStop()) {
                  logDebugMessage('shouldStop after grouping.');
                  end();
                  return;
                }

                logDebugMessage(`Fetch ${significantItemGroups.length} group histograms.`);

                const groupHistogramQueue = queue(async function (cpg: SignificantItemGroup) {
                  if (shouldStop()) {
                    logDebugMessage('shouldStop abort fetching group histograms.');
                    groupHistogramQueue.kill();
                    end();
                    return;
                  }

                  if (overallTimeSeries !== undefined) {
                    const histogramQuery = getHistogramQuery(request.body, getGroupFilter(cpg));

                    let cpgTimeSeries: NumericChartData;
                    try {
                      cpgTimeSeries = (
                        (await fetchHistogramsForFields(
                          client,
                          request.body.index,
                          histogramQuery,
                          // fields
                          [
                            {
                              fieldName: request.body.timeFieldName,
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
                          sampleProbability,
                          RANDOM_SAMPLER_SEED
                        )) as [NumericChartData]
                      )[0];
                    } catch (e) {
                      if (!isRequestAbortedError(e)) {
                        logger.error(
                          `Failed to fetch the histogram data for group #${
                            cpg.id
                          }, got: \n${e.toString()}`
                        );
                        pushError(`Failed to fetch the histogram data for group #${cpg.id}.`);
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

                    push(
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
                logger.error(
                  `Failed to transform field/value pairs into groups, got: \n${e.toString()}`
                );
                pushError(`Failed to transform field/value pairs into groups.`);
              }
            }
          }

          loaded(PROGRESS_STEP_HISTOGRAMS_GROUPS, false);

          logDebugMessage(`Fetch ${significantTerms.length} field/value histograms.`);

          // time series filtered by fields
          if (
            significantTerms.length > 0 &&
            overallTimeSeries !== undefined &&
            !request.body.overrides?.regroupOnly
          ) {
            const fieldValueHistogramQueue = queue(async function (cp: SignificantItem) {
              if (shouldStop()) {
                logDebugMessage('shouldStop abort fetching field/value histograms.');
                fieldValueHistogramQueue.kill();
                end();
                return;
              }

              if (overallTimeSeries !== undefined) {
                const histogramQuery = getHistogramQuery(request.body, [
                  {
                    term: { [cp.fieldName]: cp.fieldValue },
                  },
                ]);

                let cpTimeSeries: NumericChartData;

                try {
                  cpTimeSeries = (
                    (await fetchHistogramsForFields(
                      client,
                      request.body.index,
                      histogramQuery,
                      // fields
                      [
                        {
                          fieldName: request.body.timeFieldName,
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
                      sampleProbability,
                      RANDOM_SAMPLER_SEED
                    )) as [NumericChartData]
                  )[0];
                } catch (e) {
                  logger.error(
                    `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${
                      cp.fieldValue
                    }", got: \n${e.toString()}`
                  );
                  pushError(
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

                const { fieldName, fieldValue } = cp;

                loaded((1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS, false);
                pushHistogramDataLoadingState();
                push(
                  addSignificantItemsHistogramAction(
                    [
                      {
                        fieldName,
                        fieldValue,
                        histogram,
                      },
                    ],
                    version
                  )
                );
              }
            }, MAX_CONCURRENT_QUERIES);

            fieldValueHistogramQueue.push(significantTerms);
            await fieldValueHistogramQueue.drain();
          }

          // histograms for text field patterns
          if (
            overallTimeSeries !== undefined &&
            significantCategories.length > 0 &&
            !request.body.overrides?.regroupOnly
          ) {
            const significantCategoriesHistogramQueries = significantCategories.map((d) => {
              const histogramQuery = getHistogramQuery(request.body);
              const categoryQuery = getCategoryQuery(d.fieldName, [
                { key: `${d.key}`, count: d.doc_count, examples: [] },
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
                    request.body.index,
                    histogramQuery,
                    // fields
                    [
                      {
                        fieldName: request.body.timeFieldName,
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
                    sampleProbability,
                    RANDOM_SAMPLER_SEED
                  )) as [NumericChartData]
                )[0];
              } catch (e) {
                logger.error(
                  `Failed to fetch the histogram data for field/value pair "${cp.fieldName}:${
                    cp.fieldValue
                  }", got: \n${e.toString()}`
                );
                pushError(
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

              const { fieldName, fieldValue } = cp;

              loaded((1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS, false);
              pushHistogramDataLoadingState();
              push(
                addSignificantItemsHistogramAction(
                  [
                    {
                      fieldName,
                      fieldValue,
                      histogram,
                    },
                  ],
                  version
                )
              );
            }
          }

          endWithUpdatedLoadingState();
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(`Log Rate Analysis failed to finish, got: \n${e.toString()}`);
            pushError(`Log Rate Analysis failed to finish.`);
          }
          end();
        }
      }

      // Do not call this using `await` so it will run asynchronously while we return the stream already.
      runAnalysis();

      return response.ok(responseWithHeaders);
    });
  };
}
