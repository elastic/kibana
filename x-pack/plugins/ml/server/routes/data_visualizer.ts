/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

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
      validate: {},
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
      try {
        const stream = new ResponseStream();
        stream.push(JSON.stringify({ type: 'message', value: 'hey' }) + '\n');

        let count = 0;
        let aborted = false;

        request.events.aborted$.subscribe(() => {
          aborted = true;
        });

        function doStream() {
          setTimeout((): void => {
            if (aborted) {
              stream.push(null);
              return;
            }

            stream.push(JSON.stringify({ type: 'progress', value: count }) + '\n');
            stream.push(
              JSON.stringify({ type: 'number', value: Math.round(Math.random() * 100) }) + '\n'
            );

            count++;

            if (count < 100) {
              doStream();
            } else {
              stream.push(null);
            }
          }, 1000);
        }

        doStream();

        return response.ok({ body: stream });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
