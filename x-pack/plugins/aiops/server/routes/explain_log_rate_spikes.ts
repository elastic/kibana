/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import type { IRouter } from '@kbn/core/server';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { streamFactory } from '@kbn/aiops-utils';
import type { ChangePoint, NumericChartData, NumericHistogramField } from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';

import {
  addChangePointsAction,
  addChangePointsHistogramAction,
  aiopsExplainLogRateSpikesSchema,
  addErrorAction,
  resetAction,
  updateLoadingStateAction,
  AiopsExplainLogRateSpikesApiAction,
} from '../../common/api/explain_log_rate_spikes';
import { API_ENDPOINT } from '../../common/api';

import type { AiopsLicense } from '../types';

import { fetchFieldCandidates } from './queries/fetch_field_candidates';
import { fetchChangePointPValues } from './queries/fetch_change_point_p_values';

// Overall progress is a float from 0 to 1.
const LOADED_FIELD_CANDIDATES = 0.2;
const PROGRESS_STEP_P_VALUES = 0.6;
const PROGRESS_STEP_HISTOGRAMS = 0.2;

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

      const client = (await context.core).elasticsearch.client.asCurrentUser;

      const controller = new AbortController();

      let loaded = 0;
      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        shouldStop = true;
        controller.abort();
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
        controller.abort();
      });

      const { end, push, responseWithHeaders } = streamFactory<AiopsExplainLogRateSpikesApiAction>(
        request.headers,
        logger,
        request.body.compressResponse,
        true
      );

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

      async function runAnalysis() {
        push(resetAction());
        push(
          updateLoadingStateAction({
            ccsWarning: false,
            loaded,
            loadingState: i18n.translate(
              'xpack.aiops.explainLogRateSpikes.loadingState.loadingFieldCandidates',
              {
                defaultMessage: 'Loading field candidates.',
              }
            ),
          })
        );

        let fieldCandidates: Awaited<ReturnType<typeof fetchFieldCandidates>>;
        try {
          fieldCandidates = await fetchFieldCandidates(client, request.body);
        } catch (e) {
          push(addErrorAction(e.toString()));
          end();
          return;
        }

        loaded += LOADED_FIELD_CANDIDATES;

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
                  fieldCandidatesCount: fieldCandidates.length,
                },
              }
            ),
          })
        );

        if (fieldCandidates.length === 0) {
          endWithUpdatedLoadingState();
        } else if (shouldStop) {
          end();
          return;
        }

        const changePoints: ChangePoint[] = [];
        const fieldsToSample = new Set<string>();
        const chunkSize = 10;

        const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

        for (const fieldCandidatesChunk of fieldCandidatesChunks) {
          let pValues: Awaited<ReturnType<typeof fetchChangePointPValues>>;
          try {
            pValues = await fetchChangePointPValues(client, request.body, fieldCandidatesChunk);
          } catch (e) {
            push(addErrorAction(e.toString()));
            end();
            return;
          }

          if (pValues.length > 0) {
            pValues.forEach((d) => {
              fieldsToSample.add(d.fieldName);
            });
            changePoints.push(...pValues);
          }

          loaded += (1 / fieldCandidatesChunks.length) * PROGRESS_STEP_P_VALUES;
          if (pValues.length > 0) {
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
                    fieldValuePairsCount: changePoints?.length ?? 0,
                  },
                }
              ),
            })
          );

          if (shouldStop) {
            end();
            return;
          }
        }

        if (changePoints?.length === 0) {
          endWithUpdatedLoadingState();
          return;
        }

        const histogramFields: [NumericHistogramField] = [
          { fieldName: request.body.timeFieldName, type: KBN_FIELD_TYPES.DATE },
        ];

        const [overallTimeSeries] = (await fetchHistogramsForFields(
          client,
          request.body.index,
          { match_all: {} },
          // fields
          histogramFields,
          // samplerShardSize
          -1,
          undefined
        )) as [NumericChartData];

        // time series filtered by fields
        if (changePoints) {
          await asyncForEach(changePoints, async (cp, index) => {
            if (changePoints) {
              const histogramQuery = {
                bool: {
                  filter: [
                    {
                      term: { [cp.fieldName]: cp.fieldValue },
                    },
                  ],
                },
              };

              const [cpTimeSeries] = (await fetchHistogramsForFields(
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
                undefined
              )) as [NumericChartData];

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
          });
        }

        endWithUpdatedLoadingState();
      }

      // Do not call this using `await` so it will run asynchronously while we return the stream already.
      // The timeout is used because the response needs to be passed on to the client before we start pushing to the stream.
      setTimeout(() => runAnalysis(), 100);

      return response.ok(responseWithHeaders);
    }
  );
};
