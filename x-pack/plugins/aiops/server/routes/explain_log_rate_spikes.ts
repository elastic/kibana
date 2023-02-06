/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { i18n } from '@kbn/i18n';
import type { IRouter } from '@kbn/core/server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { streamFactory } from '@kbn/aiops-utils';
import type {
  ChangePoint,
  ChangePointGroup,
  NumericChartData,
  NumericHistogramField,
} from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';

import {
  addChangePointsAction,
  addChangePointsGroupAction,
  addChangePointsGroupHistogramAction,
  addChangePointsHistogramAction,
  aiopsExplainLogRateSpikesSchema,
  addErrorAction,
  pingAction,
  resetAllAction,
  resetErrorsAction,
  updateLoadingStateAction,
  AiopsExplainLogRateSpikesApiAction,
} from '../../common/api/explain_log_rate_spikes';
import { API_ENDPOINT } from '../../common/api';

import { isRequestAbortedError } from '../lib/is_request_aborted_error';
import type { AiopsLicense } from '../types';

import { duplicateIdentifier } from './queries/duplicate_identifier';
import { fetchChangePointPValues } from './queries/fetch_change_point_p_values';
import { fetchIndexInfo } from './queries/fetch_index_info';
import { dropDuplicates, fetchFrequentItems } from './queries/fetch_frequent_items';
import { getHistogramQuery } from './queries/get_histogram_query';
import { getGroupFilter } from './queries/get_group_filter';
import { getChangePointGroups } from './queries/get_change_point_groups';

// 10s ping frequency to keep the stream alive.
const PING_FREQUENCY = 10000;

// Overall progress is a float from 0 to 1.
const LOADED_FIELD_CANDIDATES = 0.2;
const PROGRESS_STEP_P_VALUES = 0.5;
const PROGRESS_STEP_GROUPING = 0.1;
const PROGRESS_STEP_HISTOGRAMS = 0.1;
const PROGRESS_STEP_HISTOGRAMS_GROUPS = 0.1;

export const defineExplainLogRateSpikesRoute = (
  router: IRouter<DataRequestHandlerContext>,
  license: AiopsLicense,
  logger: Logger
) => {
  router.post(
    {
      path: API_ENDPOINT.EXPLAIN_LOG_RATE_SPIKES,
      validate: {
        body: aiopsExplainLogRateSpikesSchema,
      },
    },
    async (context, request, response) => {
      if (!license.isActivePlatinumLicense) {
        return response.forbidden();
      }

      let logMessageCounter = 1;

      function logDebugMessage(msg: string) {
        logger.debug(`Explain Log Rate Spikes #${logMessageCounter}: ${msg}`);
        logMessageCounter++;
      }

      logDebugMessage('Starting analysis.');

      const groupingEnabled = !!request.body.grouping;

      const client = (await context.core).elasticsearch.client.asCurrentUser;

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
      } = streamFactory<AiopsExplainLogRateSpikesApiAction>(
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
            loadingState: i18n.translate(
              'xpack.aiops.explainLogRateSpikes.loadingState.doneMessage',
              {
                defaultMessage: 'Done.',
              }
            ),
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

          if (request.body.overrides?.loaded) {
            logDebugMessage(`Set 'loaded' override to '${request.body.overrides?.loaded}'.`);
            loaded = request.body.overrides?.loaded;
          }

          pushPingWithTimeout();

          // Step 1: Index Info: Field candidates, total doc count, sample probability

          const fieldCandidates: Awaited<ReturnType<typeof fetchIndexInfo>>['fieldCandidates'] = [];
          let fieldCandidatesCount = fieldCandidates.length;

          let sampleProbability = 1;
          let totalDocCount = 0;

          if (!request.body.overrides?.remainingFieldCandidates) {
            logDebugMessage('Fetch index information.');
            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
                loadingState: i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.loadingState.loadingIndexInformation',
                  {
                    defaultMessage: 'Loading index information.',
                  }
                ),
              })
            );

            try {
              const indexInfo = await fetchIndexInfo(client, request.body, abortSignal);
              fieldCandidates.push(...indexInfo.fieldCandidates);
              fieldCandidatesCount = fieldCandidates.length;
              sampleProbability = indexInfo.sampleProbability;
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
                  'xpack.aiops.explainLogRateSpikes.loadingState.identifiedFieldCandidates',
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

          // Step 2: Significant Terms

          const changePoints: ChangePoint[] = request.body.overrides?.changePoints
            ? request.body.overrides?.changePoints
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

            let pValues: Awaited<ReturnType<typeof fetchChangePointPValues>>;

            try {
              pValues = await fetchChangePointPValues(
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
              changePoints.push(...pValues);

              push(addChangePointsAction(pValues));
            }

            push(
              updateLoadingStateAction({
                ccsWarning: false,
                loaded,
                loadingState: i18n.translate(
                  'xpack.aiops.explainLogRateSpikes.loadingState.identifiedFieldValuePairs',
                  {
                    defaultMessage:
                      'Identified {fieldValuePairsCount, plural, one {# significant field/value pair} other {# significant field/value pairs}}.',
                    values: {
                      fieldValuePairsCount: changePoints.length,
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

          if (changePoints.length === 0) {
            logDebugMessage('Stopping analysis, did not find change points.');
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
                sampleProbability
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
                  'xpack.aiops.explainLogRateSpikes.loadingState.loadingHistogramData',
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
                  'xpack.aiops.explainLogRateSpikes.loadingState.groupingResults',
                  {
                    defaultMessage: 'Transforming significant field/value pairs into groups.',
                  }
                ),
                groupsMissing: true,
              })
            );

            // Deduplicated change points we pass to the `frequent_items` aggregation.
            const deduplicatedChangePoints = dropDuplicates(changePoints, duplicateIdentifier);

            try {
              const { fields, df } = await fetchFrequentItems(
                client,
                request.body.index,
                JSON.parse(request.body.searchQuery) as estypes.QueryDslQueryContainer,
                deduplicatedChangePoints,
                request.body.timeFieldName,
                request.body.deviationMin,
                request.body.deviationMax,
                logger,
                sampleProbability,
                pushError,
                abortSignal
              );

              if (shouldStop) {
                logDebugMessage('shouldStop after fetching frequent_items.');
                end();
                return;
              }

              if (fields.length > 0 && df.length > 0) {
                const changePointGroups = getChangePointGroups(df, changePoints, fields);

                // We'll find out if there's at least one group with at least two items,
                // only then will we return the groups to the clients and make the grouping option available.
                const maxItems = Math.max(...changePointGroups.map((g) => g.group.length));

                if (maxItems > 1) {
                  push(addChangePointsGroupAction(changePointGroups));
                }

                loaded += PROGRESS_STEP_GROUPING;

                pushHistogramDataLoadingState();

                if (shouldStop) {
                  logDebugMessage('shouldStop after grouping.');
                  end();
                  return;
                }

                logDebugMessage(`Fetch ${changePointGroups.length} group histograms.`);

                const groupHistogramQueue = queue(async function (cpg: ChangePointGroup) {
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
                          sampleProbability
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
                      overallTimeSeries.data.map((o, i) => {
                        const current = cpgTimeSeries.data.find(
                          (d1) => d1.key_as_string === o.key_as_string
                        ) ?? {
                          doc_count: 0,
                        };
                        return {
                          key: o.key,
                          key_as_string: o.key_as_string ?? '',
                          doc_count_change_point: current.doc_count,
                          doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                        };
                      }) ?? [];

                    push(
                      addChangePointsGroupHistogramAction([
                        {
                          id: cpg.id,
                          histogram,
                        },
                      ])
                    );
                  }
                }, MAX_CONCURRENT_QUERIES);

                groupHistogramQueue.push(changePointGroups);
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

          logDebugMessage(`Fetch ${changePoints.length} field/value histograms.`);

          // time series filtered by fields
          if (changePoints.length > 0 && overallTimeSeries !== undefined) {
            const fieldValueHistogramQueue = queue(async function (cp: ChangePoint) {
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
                      sampleProbability
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
                  overallTimeSeries.data.map((o, i) => {
                    const current = cpTimeSeries.data.find(
                      (d1) => d1.key_as_string === o.key_as_string
                    ) ?? {
                      doc_count: 0,
                    };
                    return {
                      key: o.key,
                      key_as_string: o.key_as_string ?? '',
                      doc_count_change_point: current.doc_count,
                      doc_count_overall: Math.max(0, o.doc_count - current.doc_count),
                    };
                  }) ?? [];

                const { fieldName, fieldValue } = cp;

                loaded += (1 / changePoints.length) * PROGRESS_STEP_HISTOGRAMS;
                pushHistogramDataLoadingState();
                push(
                  addChangePointsHistogramAction([
                    {
                      fieldName,
                      fieldValue,
                      histogram,
                    },
                  ])
                );
              }
            }, MAX_CONCURRENT_QUERIES);

            fieldValueHistogramQueue.push(changePoints);
            await fieldValueHistogramQueue.drain();
          }

          endWithUpdatedLoadingState();
        } catch (e) {
          if (!isRequestAbortedError(e)) {
            logger.error(
              `Explain log rate spikes analysis failed to finish, got: \n${e.toString()}`
            );
            pushError(`Explain log rate spikes analysis failed to finish.`);
          }
          end();
        }
      }

      // Do not call this using `await` so it will run asynchronously while we return the stream already.
      runAnalysis();

      return response.ok(responseWithHeaders);
    }
  );
};
