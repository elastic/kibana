/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { wrapError } from '../client/error_wrapper';
import { DataVisualizer } from '../models/data_visualizer';
import { HistogramField } from '../models/data_visualizer/data_visualizer';
import {
  dataVisualizerFieldHistogramsSchema,
  indexPatternSchema,
} from './schemas/data_visualizer_schema';
import { RouteInitialization } from '../types';
import { RuntimeMappings } from '../../common/types/fields';

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
}
