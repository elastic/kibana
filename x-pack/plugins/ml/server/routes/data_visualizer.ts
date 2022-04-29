/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { Readable } from 'stream';

import { schema } from '@kbn/config-schema';
import { IScopedClusterClient } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';

import {
  fetchChangePointPValues,
  fetchFieldsStats,
  fetchSpikeAnalysisFrequentItems,
  fetchTransactionDurationFieldCandidates,
} from '@kbn/apm-plugin/server';

import { wrapError } from '../client/error_wrapper';
import { DataVisualizer } from '../models/data_visualizer';
import { HistogramField } from '../models/data_visualizer/data_visualizer';
import {
  dataVisualizerFieldHistogramsSchema,
  indexPatternSchema,
} from './schemas/data_visualizer_schema';
import { RouteInitialization } from '../types';
import { RuntimeMappings } from '../../common/types/fields';

import { generateItemsets } from './generate_itemsets';

class ResponseStream extends Readable {
  _read(): void {}
}

function getHistogramsForFields(
  client: IScopedClusterClient,
  indexPattern: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings: RuntimeMappings
) {
  const dv = new DataVisualizer(client);
  return dv.getHistogramsForFields(indexPattern, query, fields, samplerShardSize, runtimeMappings);
}

// Overall progress is a float from 0 to 1.
// const LOADED_OVERALL_HISTOGRAM = 0.05;
const LOADED_FIELD_CANDIDATES = 0.05;
const LOADED_DONE = 1;
const PROGRESS_STEP_P_VALUES = 0.6;
const PROGRESS_STEP_HISTOGRAMS = 0.1;
const PROGRESS_STEP_FREQUENT_ITEMS = 0.1;

export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
}

export interface HistogramItem {
  doc_count: number;
  key: number;
  key_as_string: string;
}

export interface ChangePoint extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
}
export interface ChangePointHistogram extends FieldValuePair {
  histogram: HistogramItem[];
}

export type Items = Record<string, string[]>;
interface ItemsMeta {
  buckets: Array<{ key: Items; doc_count: number; support: number }>;
}
export type FrequentItems = ItemsMeta;

export type FrequentItemsHistograms = Record<string, HistogramItem[]>;

/**
 * Routes for the index data visualizer.
 */
export function dataVisualizerRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup DataVisualizer
   *
   * @api {post} /api/ml/data_visualizer/get_field_histograms/:indexPattern Get histograms for fields
   * @apiName GetHistogramsForFields
   * @apiDescription Returns the histograms on a list fields in the specified index pattern.
   *
   * @apiSchema (params) indexPatternSchema
   * @apiSchema (body) dataVisualizerFieldHistogramsSchema
   *
   * @apiSuccess {Object} fieldName histograms by field, keyed on the name of the field.
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_field_histograms/{indexPattern}',
      validate: {
        params: indexPatternSchema,
        body: dataVisualizerFieldHistogramsSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const {
          params: { indexPattern },
          body: { query, fields, samplerShardSize, runtimeMappings },
        } = request;

        const results = await getHistogramsForFields(
          client,
          indexPattern,
          query,
          fields,
          samplerShardSize,
          runtimeMappings
        );

        return response.ok({
          body: results,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  router.post(
    {
      path: '/api/ml/data_visualizer/spike_analysis',
      validate: {
        body: schema.any(),
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const stream = new ResponseStream();

        async function doStream() {
          function streamPush(d: any) {
            stream.push(JSON.stringify(d) + '\n');
            // stream._compressor.flush();
          }

          let loaded = 0;
          let shouldStop = false;

          request.events.aborted$.subscribe(() => {
            shouldStop = true;
          });
          request.events.completed$.subscribe(() => {
            shouldStop = true;
          });

          streamPush({ ccsWarning: false, loaded: 0, loadingState: 'Loading field candidates.' });

          const {
            indexPatternTitle,
            discoverQuery,
            baselineMin,
            baselineMax,
            deviationMin,
            deviationMax,
            ...params
          } = request.body;
          params.start = +new Date(params.start);
          params.end = +new Date(params.end);

          const paramsWithIndex = {
            ...params,
            index: indexPatternTitle ?? '*',
          };

          const { fieldCandidates } = await fetchTransactionDurationFieldCandidates(
            client.asCurrentUser,
            {
              ...params,
              index: indexPatternTitle ?? '*',
            }
          );

          if (shouldStop) {
            stream.push(null);
            return;
          }

          loaded += LOADED_FIELD_CANDIDATES;
          streamPush({
            loaded,
            loadingState: `Identified ${fieldCandidates.length} field candidates.`,
          });

          const changePoints: ChangePoint[] = [];
          const fieldsToSample = new Set<string>();
          const chunkSize = 10;

          const fieldCandidatesChunks = chunk(fieldCandidates, chunkSize);

          for (const fieldCandidatesChunk of fieldCandidatesChunks) {
            const { changePoints: pValues } = await fetchChangePointPValues(
              client.asCurrentUser,
              paramsWithIndex,
              fieldCandidatesChunk,
              {
                baselineMin,
                baselineMax,
                deviationMin,
                deviationMax,
              }
            );

            if (pValues.length > 0) {
              pValues.forEach((d) => {
                fieldsToSample.add(d.fieldName);
              });
              changePoints.push(...pValues);
              // responseUpdate.changePoints = getChangePointsSortedByScore([...changePoints]);
            }

            loaded += (1 / fieldCandidatesChunks.length) * PROGRESS_STEP_P_VALUES;
            streamPush({
              changePoints: pValues,
              loaded,
              loadingState: `Identified ${
                changePoints?.length ?? 0
              } significant field/value pairs.`,
            });

            if (shouldStop) {
              stream.push(null);
              return;
            }
          }

          streamPush({
            loadingState: `Loading fields stats.`,
          });

          const { stats: fieldStats } = await fetchFieldsStats(
            client.asCurrentUser,
            {
              ...params,
              index: indexPatternTitle ?? '*',
            },
            [...fieldsToSample]
          );

          streamPush({
            fieldStats,
          });

          loaded += 0.05;

          streamPush({
            loaded,
            loadingState: `Loading overall timeseries.`,
          });

          const overallTimeSeries = await getHistogramsForFields(
            client,
            indexPatternTitle,
            discoverQuery,
            // fields
            [{ fieldName: '@timestamp', type: 'date' }],
            // samplerShardSize
            -1,
            undefined
          );

          streamPush({
            overallTimeSeries,
          });

          loaded += 0.05;
          streamPush({
            loaded,
            loadingState: `Loading significant timeseries.`,
          });

          // time series filtered by fields
          if (changePoints) {
            await asyncForEach(changePoints, async (cp, index) => {
              if (changePoints && overallTimeSeries) {
                const histogramQuery = {
                  bool: {
                    filter: [
                      ...discoverQuery.bool.filter,
                      {
                        term: { [cp.fieldName]: cp.fieldValue },
                      },
                    ],
                  },
                };

                const cpTimeSeries = await getHistogramsForFields(
                  client,
                  indexPatternTitle,
                  histogramQuery,
                  // fields
                  [
                    {
                      fieldName: '@timestamp',
                      type: 'date',
                      interval: overallTimeSeries[0].interval,
                      min: overallTimeSeries[0].stats[0],
                      max: overallTimeSeries[0].stats[1],
                    },
                  ],
                  // samplerShardSize
                  -1,
                  undefined
                );

                const { fieldName, fieldValue } = cp;

                loaded += (1 / changePoints.length) * PROGRESS_STEP_HISTOGRAMS;
                streamPush({
                  loaded,
                  changePointsHistograms: [
                    {
                      fieldName,
                      fieldValue,
                      histogram: cpTimeSeries[0].data,
                    },
                  ],
                });
              }
            });
          }

          const frequentItemsFieldCandidates = changePoints
            ?.map(({ fieldName, fieldValue }) => ({ fieldName, fieldValue }))
            .filter(
              (d) =>
                d.fieldName !== 'clientip' &&
                d.fieldName !== 'ip' &&
                d.fieldName !== 'extension.keyword'
            );

          if (
            Array.isArray(frequentItemsFieldCandidates) &&
            frequentItemsFieldCandidates.length > 10
          ) {
            frequentItemsFieldCandidates.length = 10;
          }

          const orderedFields = [
            ...(new Set(frequentItemsFieldCandidates?.map((d) => d.fieldName)) ?? []),
          ];

          if (frequentItemsFieldCandidates === undefined) {
            streamPush({
              loaded: LOADED_DONE,
              isRunning: false,
              loadingState: `Done.`,
            });
            stream.push(null);
            return;
          }

          loaded += PROGRESS_STEP_FREQUENT_ITEMS;
          streamPush({
            loaded,
            loadingState: `Loading frequent item sets.`,
          });

          const { frequentItems, totalDocCount } = await fetchSpikeAnalysisFrequentItems(
            client.asCurrentUser,
            paramsWithIndex,
            frequentItemsFieldCandidates,
            { baselineMin, baselineMax, deviationMin, deviationMax }
          );

          streamPush({
            loadingState: `Generating tree structure`,
          });

          const { itemsets } = generateItemsets(
            orderedFields,
            frequentItems,
            changePoints ?? [],
            totalDocCount ? totalDocCount : 0
          );

          streamPush({
            orderedFields,
            frequentItems,
            totalDocCount: totalDocCount ? totalDocCount : 0,
          });

          const frequentItemsHistograms: FrequentItemsHistograms = {};

          await asyncForEach(itemsets, async (fi, index) => {
            if (overallTimeSeries) {
              const fiFilters = [];

              for (const [fieldName, values] of Object.entries(fi.key)) {
                for (const value of values) {
                  fiFilters.push({
                    term: { [fieldName]: value },
                  });
                }
              }

              const histogramQuery = {
                bool: {
                  filter: [...discoverQuery.bool.filter, ...fiFilters],
                },
              };

              const fiTimeSeries = await getHistogramsForFields(
                client,
                indexPatternTitle,
                histogramQuery,
                // fields
                [
                  {
                    fieldName: '@timestamp',
                    type: 'date',
                    interval: overallTimeSeries[0].interval,
                    min: overallTimeSeries[0].stats[0],
                    max: overallTimeSeries[0].stats[1],
                  },
                ],
                // samplerShardSize
                -1,
                undefined
              );

              frequentItemsHistograms[JSON.stringify(fi.key)] = fiTimeSeries[0].data;
            }
          });

          streamPush({
            frequentItemsHistograms,
            loaded: LOADED_DONE,
            isRunning: false,
            loadingState: `Done.`,
          });

          stream.push(null);
        }

        doStream();

        return response.ok({
          body: stream,
        });
      } catch (e) {
        console.log('error', e);
        return response.customError(wrapError(e));
      }
    })
  );
}
