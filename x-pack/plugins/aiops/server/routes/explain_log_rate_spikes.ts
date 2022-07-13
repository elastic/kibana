/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import { asyncForEach } from '@kbn/std';
import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { streamFactory } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import { fetchHistogramsForFields } from '@kbn/ml-agg-utils';

import {
  addChangePointsAction,
  addChangePointsHistogramAction,
  aiopsExplainLogRateSpikesSchema,
  errorAction,
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
        logger
      );

      // Async IIFE to run the analysis while not blocking returning `responseWithHeaders`.
      (async () => {
        push(resetAction());
        push(
          updateLoadingStateAction({
            ccsWarning: false,
            loaded,
            loadingState: 'Loading field candidates.',
          })
        );

        let fieldCandidates: Awaited<ReturnType<typeof fetchFieldCandidates>>;
        try {
          fieldCandidates = await fetchFieldCandidates(client, request.body);
        } catch (e) {
          push(errorAction(e.toString()));
          end();
          return;
        }

        if (fieldCandidates.length > 0) {
          loaded += LOADED_FIELD_CANDIDATES;
        } else {
          loaded = 1;
        }

        push(
          updateLoadingStateAction({
            ccsWarning: false,
            loaded,
            loadingState: `Identified ${fieldCandidates.length} field candidates.`,
          })
        );

        if (shouldStop || fieldCandidates.length === 0) {
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
            push(errorAction(e.toString()));
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
              loadingState: `Identified ${
                changePoints?.length ?? 0
              } significant field/value pairs.`,
            })
          );

          if (shouldStop) {
            end();
            return;
          }
        }

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

              const cpTimeSeries = await fetchHistogramsForFields(
                client,
                request.body.index,
                histogramQuery,
                // fields
                [
                  {
                    fieldName: request.body.timeFieldName,
                    type: 'date',
                    // interval: overallTimeSeries[0].interval,
                    // min: overallTimeSeries[0].stats[0],
                    // max: overallTimeSeries[0].stats[1],
                  },
                ],
                // samplerShardSize
                -1,
                undefined
              );

              const { fieldName, fieldValue } = cp;

              loaded += (1 / changePoints.length) * PROGRESS_STEP_HISTOGRAMS;
              push(
                updateLoadingStateAction({
                  ccsWarning: false,
                  loaded,
                  loadingState: `Loading histogram data.`,
                })
              );
              push(
                addChangePointsHistogramAction([
                  {
                    fieldName,
                    fieldValue,
                    // TODO Fix types
                    // @ts-ignore
                    histogram: cpTimeSeries[0].data,
                  },
                ])
              );
            }
          });
        }

        end();
      })();

      return response.ok(responseWithHeaders);
    }
  );
};
