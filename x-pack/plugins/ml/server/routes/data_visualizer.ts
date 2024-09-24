/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { FieldsForHistograms } from '@kbn/ml-agg-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import { DataVisualizer } from '../models/data_visualizer';
import {
  dataVisualizerFieldHistogramsResponse,
  dataVisualizerFieldHistogramsSchema,
  indexPatternSchema,
} from './schemas/data_visualizer_schema';
import type { RouteInitialization } from '../types';

function getHistogramsForFields(
  client: IScopedClusterClient,
  indexPattern: string,
  query: any,
  fields: FieldsForHistograms,
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
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/data_visualizer/get_field_histograms/{indexPattern}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetFieldInfo'],
      },
      summary: 'Gets histograms for fields',
      description: 'Returns the histograms on a list fields in the specified index pattern.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: indexPatternSchema,
            body: dataVisualizerFieldHistogramsSchema,
          },
          response: {
            200: {
              body: dataVisualizerFieldHistogramsResponse,
              description: 'Histograms by field, keyed on the name of the field.',
            },
          },
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
