/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { DataVisualizer } from '../models/data_visualizer';
import { Field } from '../models/data_visualizer/data_visualizer';
import {
  dataVisualizerFieldStatsSchema,
  dataVisualizerOverallStatsSchema,
  indexPatternTitleSchema,
} from './schemas/data_visualizer_schema';
import { RouteInitialization } from '../types';

function getOverallStats(
  context: RequestHandlerContext,
  indexPatternTitle: string,
  query: object,
  aggregatableFields: string[],
  nonAggregatableFields: string[],
  samplerShardSize: number,
  timeFieldName: string,
  earliestMs: number,
  latestMs: number
) {
  const dv = new DataVisualizer(context.ml!.mlClient.callAsCurrentUser);
  return dv.getOverallStats(
    indexPatternTitle,
    query,
    aggregatableFields,
    nonAggregatableFields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs
  );
}

function getStatsForFields(
  context: RequestHandlerContext,
  indexPatternTitle: string,
  query: any,
  fields: Field[],
  samplerShardSize: number,
  timeFieldName: string,
  earliestMs: number,
  latestMs: number,
  interval: number,
  maxExamples: number
) {
  const dv = new DataVisualizer(context.ml!.mlClient.callAsCurrentUser);
  return dv.getStatsForFields(
    indexPatternTitle,
    query,
    fields,
    samplerShardSize,
    timeFieldName,
    earliestMs,
    latestMs,
    interval,
    maxExamples
  );
}

/**
 * Routes for the index data visualizer.
 */
export function dataVisualizerRoutes({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup DataVisualizer
   *
   * @api {post} /api/ml/data_visualizer/get_field_stats/:indexPatternTitle Get stats for fields
   * @apiName GetStatsForFields
   * @apiDescription Returns fields stats of the index pattern.
   *
   * @apiSchema (params) indexPatternTitleSchema
   * @apiSchema (body) dataVisualizerFieldStatsSchema
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_field_stats/{indexPatternTitle}',
      validate: {
        params: indexPatternTitleSchema,
        body: dataVisualizerFieldStatsSchema,
      },
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
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
          },
        } = request;

        const results = await getStatsForFields(
          context,
          indexPatternTitle,
          query,
          fields,
          samplerShardSize,
          timeFieldName,
          earliest,
          latest,
          interval,
          maxExamples
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
   * @apiDescription Returns overall stats of the index pattern.
   *
   * @apiSchema (params) indexPatternTitleSchema
   * @apiSchema (body) dataVisualizerOverallStatsSchema
   */
  router.post(
    {
      path: '/api/ml/data_visualizer/get_overall_stats/{indexPatternTitle}',
      validate: {
        params: indexPatternTitleSchema,
        body: dataVisualizerOverallStatsSchema,
      },
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
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
          },
        } = request;

        const results = await getOverallStats(
          context,
          indexPatternTitle,
          query,
          aggregatableFields,
          nonAggregatableFields,
          samplerShardSize,
          timeFieldName,
          earliest,
          latest
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
