/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '../../../../../src/core/server/elasticsearch/client/scoped_cluster_client';
import type { RuntimeMappings } from '../../common/types/fields';
import { wrapError } from '../client/error_wrapper';
import type { HistogramField } from '../models/data_visualizer/data_visualizer';
import { DataVisualizer } from '../models/data_visualizer/data_visualizer';
import type { RouteInitialization } from '../types';
import {
  dataVisualizerFieldHistogramsSchema,
  indexPatternTitleSchema,
} from './schemas/data_visualizer_schema';

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
}
