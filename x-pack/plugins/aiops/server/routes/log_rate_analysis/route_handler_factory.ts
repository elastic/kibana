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
import { streamFactory } from '@kbn/ml-response-stream/server';
import type {
  SignificantTerm,
  SignificantTermGroup,
  NumericChartData,
  NumericHistogramField,
} from '@kbn/ml-agg-utils';
import { SIGNIFICANT_TERM_TYPE } from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';
import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { RANDOM_SAMPLER_SEED, AIOPS_TELEMETRY_ID } from '../../../common/constants';
import {
  addSignificantTermsAction,
  addSignificantTermsGroupAction,
  addSignificantTermsGroupHistogramAction,
  addSignificantTermsHistogramAction,
  addErrorAction,
  pingAction,
  resetAllAction,
  resetErrorsAction,
  resetGroupsAction,
  updateLoadingStateAction,
  AiopsLogRateAnalysisApiAction,
  type AiopsLogRateAnalysisSchema,
} from '../../../common/api/log_rate_analysis';
import { getCategoryQuery } from '../../../common/api/log_categorization/get_category_query';
import { AIOPS_API_ENDPOINT } from '../../../common/api';

import { PLUGIN_ID } from '../../../common';

import { isRequestAbortedError } from '../../lib/is_request_aborted_error';
import type { AiopsLicense } from '../../types';

import { fetchSignificantCategories } from './queries/fetch_significant_categories';
import { fetchSignificantTermPValues } from './queries/fetch_significant_term_p_values';
import { fetchIndexInfo } from './queries/fetch_index_info';
import { fetchFrequentItemSets } from './queries/fetch_frequent_item_sets';
import { fetchTerms2CategoriesCounts } from './queries/fetch_terms_2_categories_counts';
import { getHistogramQuery } from './queries/get_histogram_query';
import { getGroupFilter } from './queries/get_group_filter';
import { getSignificantTermGroups } from './queries/get_significant_term_groups';
import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

// Overall progress is a float from 0 to 1.
const LOADED_FIELD_CANDIDATES = 0.2;
const PROGRESS_STEP_P_VALUES = 0.5;
const PROGRESS_STEP_GROUPING = 0.1;
const PROGRESS_STEP_HISTOGRAMS = 0.1;
const PROGRESS_STEP_HISTOGRAMS_GROUPS = 0.1;

export const routeHandlerFactory: (
  license: AiopsLicense,
  logger: Logger,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
) => RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema> =
  (license, logger, coreStart, usageCounter) =>
  async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema>,
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
      let logMessageCounter = 1;

      function logDebugMessage(msg: string) {
        logger.debug(`Log Rate Analysis #${logMessageCounter}: ${msg}`);
        logMessageCounter++;
      }

      logDebugMessage('Starting analysis.');

      const groupingEnabled = !!request.body.grouping;
      const sampleProbability = request.body.sampleProbability ?? 1;

      const controller = new AbortController();
      const abortSignal = controller.signal;

      let isRunning = false;
      let loaded = 0;
      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        logDebugMessage('aborted$ subscription trigger.');
        shouldStop = true;
        controller.abort();
      });
      request.events.completed$.subscribe(() => {
        logDebugMessage('completed$ subscription trigger.');
        shouldStop = true;
        controller.abort();
      });

      const {
        end: streamEnd,
        push,
        responseWithHeaders,
      } = streamFactory<AiopsLogRateAnalysisApiAction>(
        request.headers,
        logger,
        request.body.compressResponse,
        request.body.flushFix
      );

      function pushPingWithTimeout() {
        setTimeout(() => {
          if (isRunning) {
            logDebugMessage('Ping message.');
            push(pingAction());
            pushPingWithTimeout();
          }
        }, PING_FREQUENCY);
      }

      function end() {
        if (isRunning) {
          isRunning = false;
          logDebugMessage('Ending analysis.');
          streamEnd();
        } else {
          logDebugMessage('end() was called again with isRunning already being false.');
        }
      }

      function endWithUpdatedLoadingState() {
        push(
          updateLoadingStateAction({
            ccsWarning: false,
            loaded: 1,
            loadingState: i18n.translate('xpack.aiops.logRateAnalysis.loadingState.doneMessage', {
              defaultMessage: 'Done.',
            }),
          })
        );

        end();
      }

      function pushError(m: string) {
        logDebugMessage('Push error.');
        push(addErrorAction(m));
      }

      async function runAnalysis() {
        try {
          isRunning = true;

          if (!request.body.overrides) {
            logDebugMessage('Full Reset.');
            push(resetAllAction());
          } else {
            logDebugMessage('Reset Errors.');
            push(resetErrorsAction());
          }

          if (request.body.overrides?.regroupOnly) {
            logDebugMessage('Reset Groups.');
            push(resetGroupsAction());
          }

          if (request.body.overrides?.loaded) {
            logDebugMessage(`Set 'loaded' override to '${request.body.overrides?.loaded}'.`);
            loaded = request.body.overrides?.loaded;
          }

          pushPingWithTimeout();

          // Step 1: Index Info: Field candidates, total doc count, sample probability

          const fieldCandidates: string[] = [];
          let fieldCandidatesCount = fieldCandidates.length;

          const textFieldCandidates: string[] = [];

          let totalDocCount = 0;

          if (!request.body.overrides?.remainingFieldCandidates) {
            logDebugMessage('Fetch index information.');
            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
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
                request.body,
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
            logDebugMessage(`Sample probability: ${sampleProbability}`);

            loaded += LOADED_FIELD_CANDIDATES;

            pushPingWithTimeout();

            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
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
            } else if (shouldStop) {
              logDebugMessage('shouldStop after fetching field candidates.');
              end();
              return;
            }
          }

          // Step 2: Significant Categories and Terms

          // This will store the combined count of detected significant log patterns and keywords
          let fieldValuePairsCount = 0;

          const significantCategories: SignificantTerm[] = request.body.overrides?.significantTerms
            ? request.body.overrides?.significantTerms.filter(
                (d) => d.type === SIGNIFICANT_TERM_TYPE.LOG_PATTERN
              )
            : [];

          // Get significant categories of text fields
          if (textFieldCandidates.length > 0) {
            significantCategories.push(
              ...(await fetchSignificantCategories(
                client,
                request.body,
                textFieldCandidates,
                logger,
                sampleProbability,
                pushError,
                abortSignal
              ))
            );

            if (significantCategories.length > 0) {
              push(addSignificantTermsAction(significantCategories));
            }
          }

          const significantTerms: SignificantTerm[] = request.body.overrides?.significantTerms
            ? request.body.overrides?.significantTerms.filter(
                (d) => d.type === SIGNIFICANT_TERM_TYPE.KEYWORD
              )
            : [];

          const fieldsToSample = new Set<string>();

          // Don't use more than 10 here otherwise Kibana will emit an error
          // regarding a limit of abort signal listeners of more than 10.
          const MAX_CONCURRENT_QUERIES = 10;

          let remainingFieldCandidates: string[];
          let loadingStepSizePValues = PROGRESS_STEP_P_VALUES;

          if (request.body.overrides?.remainingFieldCandidates) {
            fieldCandidates.push(...request.body.overrides?.remainingFieldCandidates);
            remainingFieldCandidates = request.body.overrides?.remainingFieldCandidates;
            fieldCandidatesCount = fieldCandidates.length;
            loadingStepSizePValues =
              LOADED_FIELD_CANDIDATES +
              PROGRESS_STEP_P_VALUES -
              (request.body.overrides?.loaded ?? PROGRESS_STEP_P_VALUES);
          } else {
            remainingFieldCandidates = fieldCandidates;
          }

          logDebugMessage('Fetch p-values.');

          const pValuesQueue = queue(async function (fieldCandidate: string) {
            loaded += (1 / fieldCandidatesCount) * loadingStepSizePValues;

            let pValues: Awaited<ReturnType<typeof fetchSignificantTermPValues>>;

            try {
              pValues = await fetchSignificantTermPValues(
                client,
                request.body,
                [fieldCandidate],
                logger,
                sampleProbability,
                pushError,
                abortSignal
              );
            } catch (e) {
              if (!isRequestAbortedError(e)) {
                logger.error(
                  `Failed to fetch p-values for '${fieldCandidate}', got: \n${e.toString()}`
                );
                pushError(`Failed to fetch p-values for '${fieldCandidate}'.`);
              }
              return;
            }

            remainingFieldCandidates = remainingFieldCandidates.filter((d) => d !== fieldCandidate);

            if (pValues.length > 0) {
              pValues.forEach((d) => {
                fieldsToSample.add(d.fieldName);
              });
              significantTerms.push(...pValues);

              push(addSignificantTermsAction(pValues));
            }

            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
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

          pValuesQueue.push(fieldCandidates, (err) => {
            if (err) {
              logger.error(`Failed to fetch p-values.', got: \n${err.toString()}`);
              pushError(`Failed to fetch p-values.`);
              pValuesQueue.kill();
              end();
            } else if (shouldStop) {
              logDebugMessage('shouldStop fetching p-values.');
              pValuesQueue.kill();
              end();
            }
          });
          await pValuesQueue.drain();

          fieldValuePairsCount = significantCategories.length + significantTerms.length;

          if (fieldValuePairsCount === 0) {
            logDebugMessage('Stopping analysis, did not find significant terms.');
            endWithUpdatedLoadingState();
            return;
          }

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
                loaded,
                loadingState: i18n.translate(
                  'xpack.aiops.logRateAnalysis.loadingState.loadingHistogramData',
                  {
                    defaultMessage: 'Loading histogram data.',
                  }
                ),
              })
            );
          }

          if (shouldStop) {
            logDebugMessage('shouldStop after fetching overall histogram.');
            end();
            return;
          }

          if (groupingEnabled) {
            logDebugMessage('Group results.');

            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
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

              if (shouldStop) {
                logDebugMessage('shouldStop after fetching frequent_item_sets.');
                end();
                return;
              }

              if (fields.length > 0 && itemSets.length > 0) {
                const significantTermGroups = getSignificantTermGroups(
                  itemSets,
                  [...significantTerms, ...significantCategories],
                  fields
                );

                // We'll find out if there's at least one group with at least two items,
                // only then will we return the groups to the clients and make the grouping option available.
                const maxItems = Math.max(...significantTermGroups.map((g) => g.group.length));

                if (maxItems > 1) {
                  push(addSignificantTermsGroupAction(significantTermGroups));
                }

                loaded += PROGRESS_STEP_GROUPING;

                pushHistogramDataLoadingState();

                if (shouldStop) {
                  logDebugMessage('shouldStop after grouping.');
                  end();
                  return;
                }

                logDebugMessage(`Fetch ${significantTermGroups.length} group histograms.`);

                const groupHistogramQueue = queue(async function (cpg: SignificantTermGroup) {
                  if (shouldStop) {
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
                    const histogram =
                      overallTimeSeries.data.map((o) => {
                        const current = cpgTimeSeries.data.find(
                          (d1) => d1.key_as_string === o.key_as_string
                        ) ?? {
                          doc_count: 0,
                        };
                        return {
                          key: o.key,
                          key_as_string: o.key_as_string ?? '',
                          doc_count_significant_term: current.doc_count,
                          doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                        };
                      }) ?? [];

                    push(
                      addSignificantTermsGroupHistogramAction([
                        {
                          id: cpg.id,
                          histogram,
                        },
                      ])
                    );
                  }
                }, MAX_CONCURRENT_QUERIES);

                groupHistogramQueue.push(significantTermGroups);
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

          loaded += PROGRESS_STEP_HISTOGRAMS_GROUPS;

          logDebugMessage(`Fetch ${significantTerms.length} field/value histograms.`);

          // time series filtered by fields
          if (
            significantTerms.length > 0 &&
            overallTimeSeries !== undefined &&
            !request.body.overrides?.regroupOnly
          ) {
            const fieldValueHistogramQueue = queue(async function (cp: SignificantTerm) {
              if (shouldStop) {
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

                const histogram =
                  overallTimeSeries.data.map((o) => {
                    const current = cpTimeSeries.data.find(
                      (d1) => d1.key_as_string === o.key_as_string
                    ) ?? {
                      doc_count: 0,
                    };
                    return {
                      key: o.key,
                      key_as_string: o.key_as_string ?? '',
                      doc_count_significant_term: current.doc_count,
                      doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                    };
                  }) ?? [];

                const { fieldName, fieldValue } = cp;

                loaded += (1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS;
                pushHistogramDataLoadingState();
                push(
                  addSignificantTermsHistogramAction([
                    {
                      fieldName,
                      fieldValue,
                      histogram,
                    },
                  ])
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

              const histogram =
                overallTimeSeries.data.map((o) => {
                  const current = catTimeSeries.data.find(
                    (d1) => d1.key_as_string === o.key_as_string
                  ) ?? {
                    doc_count: 0,
                  };
                  return {
                    key: o.key,
                    key_as_string: o.key_as_string ?? '',
                    doc_count_significant_term: current.doc_count,
                    doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                  };
                }) ?? [];

              const { fieldName, fieldValue } = cp;

              loaded += (1 / fieldValuePairsCount) * PROGRESS_STEP_HISTOGRAMS;
              pushHistogramDataLoadingState();
              push(
                addSignificantTermsHistogramAction([
                  {
                    fieldName,
                    fieldValue,
                    histogram,
                  },
                ])
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
