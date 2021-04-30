/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { DataVisualizer } from '../models/data_visualizer';
import { Field, HistogramField } from '../models/data_visualizer/data_visualizer';
import {
  dataVisualizerFieldHistogramsSchema,
  dataVisualizerFieldStatsSchema,
  dataVisualizerOverallStatsSchema,
  indexPatternTitleSchema,
} from './schemas/data_visualizer_schema';
import { RouteInitialization } from '../types';
import { RuntimeMappings } from '../../common/types/fields';

function getOverallStats(
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: object,
  aggregatableFields: string[],
  nonAggregatableFields: string[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  runtimeMappings: RuntimeMappings
) {
  const dv = new DataVisualizer(client);
  return dv.getOverallStats(
    indexPatternTitle,
    query,
    aggregatableFields,
    nonAggregatableFields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs,
    runtimeMappings
  );
}

function getStatsForFields(
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string | undefined,
  earliestMs: number | undefined,
  latestMs: number | undefined,
  interval: number | undefined,
  maxExamples: number,
  runtimeMappings: RuntimeMappings
) {
  const dv = new DataVisualizer(client);
  return dv.getStatsForFields(
    indexPatternTitle,
    query,
    fields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs,
    interval,
    maxExamples,
    runtimeMappings
  );
}

function getHistogramsForFields(
  client: IScopedClusterClient,
  indexPatternTitle: string,
  query: any,
  fields: HistogramField[],
  samplerShardSize: number,
  runtimeMappings: RuntimeMappings
) {
  const dv = new DataVisualizer(client);
  return dv.getHistogramsForFields(
    indexPatternTitle,
    query,
    fields,
    samplerShardSize,
    runtimeMappings
  );
}

/**
 * Routes for the index data visualizer.
 */
export function dataVisualizerRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup DataVisualizer
   *
   * @api {post} /api/ml/data_visualizer/get_field_histograms/:indexPatternTitle Get histograms for fields
   * @apiName GetHistogramsForFields
   * @apiDescription Returns the histograms on a list fields in the specified index pattern.
   *
   * @apiSchema (params) indexPatternTitleSchema
   * @apiSchema (body) dataVisualizerFieldHistogramsSchema
   *
   * @apiSuccess {Object} fieldName histograms by field, keyed on the name of the field.
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_field_histograms/{indexPatternTitle}',
      validate: {
        params: indexPatternTitleSchema,
        body: dataVisualizerFieldHistogramsSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const {
          params: { indexPatternTitle },
          body: { query, fields, samplerShardSize, runtimeMappings },
        } = request;

        const results = await getHistogramsForFields(
          client,
          indexPatternTitle,
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

  /**
   * @apiGroup DataVisualizer
   *
   * @api {post} /api/ml/data_visualizer/get_field_stats/:indexPatternTitle Get stats for fields
   * @apiName GetStatsForFields
   * @apiDescription Returns the stats on individual fields in the specified index pattern.
   *
   * @apiSchema (params) indexPatternTitleSchema
   * @apiSchema (body) dataVisualizerFieldStatsSchema
   *
   * @apiSuccess {Object} fieldName stats by field, keyed on the name of the field.
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_field_stats/{indexPatternTitle}',
      validate: {
        params: indexPatternTitleSchema,
        body: dataVisualizerFieldStatsSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const {
          params: { indexPatternTitle },
          body: {
            query,
            fields,
            samplerShardSize,
            timeFieldName,
            earliest,
            latest,
            interval,
            maxExamples,
            runtimeMappings,
          },
        } = request;
        const results = await getStatsForFields(
          client,
          indexPatternTitle,
          query,
          fields,
          samplerShardSize,
          timeFieldName,
          earliest,
          latest,
          interval,
          maxExamples,
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

  /**
   * @apiGroup DataVisualizer
   *
   * @api {post} /api/ml/data_visualizer/get_overall_stats/:indexPatternTitle Get overall stats
   * @apiName GetOverallStats
   * @apiDescription Returns the top level overall stats for the specified index pattern.
   *
   * @apiSchema (params) indexPatternTitleSchema
   * @apiSchema (body) dataVisualizerOverallStatsSchema
   *
   * @apiSuccess {number} totalCount total count of documents.
   * @apiSuccess {Object} aggregatableExistsFields stats on aggregatable fields that exist in documents.
   * @apiSuccess {Object} aggregatableNotExistsFields stats on aggregatable fields that do not exist in documents.
   * @apiSuccess {Object} nonAggregatableExistsFields stats on non-aggregatable fields that exist in documents.
   * @apiSuccess {Object} nonAggregatableNotExistsFields stats on non-aggregatable fields that do not exist in documents.
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_overall_stats/{indexPatternTitle}',
      validate: {
        params: indexPatternTitleSchema,
        body: dataVisualizerOverallStatsSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const {
          params: { indexPatternTitle },
          body: {
            query,
            aggregatableFields,
            nonAggregatableFields,
            samplerShardSize,
            timeFieldName,
            earliest,
            latest,
            runtimeMappings,
          },
        } = request;

        const results = await getOverallStats(
          client,
          indexPatternTitle,
          query,
          aggregatableFields,
          nonAggregatableFields,
          samplerShardSize,
          timeFieldName,
          earliest,
          latest,
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
}
