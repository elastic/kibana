/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import type { RouteInitialization } from '../types';
import {
  getCardinalityOfFieldsResponse,
  getCardinalityOfFieldsSchema,
  getTimeFieldRangeResponse,
  getTimeFieldRangeSchema,
} from './schemas/fields_service_schema';
import { fieldsServiceProvider } from '../models/fields_service';

function getCardinalityOfFields(client: IScopedClusterClient, payload: any) {
  const fs = fieldsServiceProvider(client);
  const { index, fieldNames, query, timeFieldName, earliestMs, latestMs } = payload;
  return fs.getCardinalityOfFields(index, fieldNames, query, timeFieldName, earliestMs, latestMs);
}

function getTimeFieldRange(client: IScopedClusterClient, payload: any) {
  const fs = fieldsServiceProvider(client);
  const { index, timeFieldName, query, runtimeMappings, indicesOptions } = payload;
  return fs.getTimeFieldRange(index, timeFieldName, query, runtimeMappings, indicesOptions);
}

/**
 * Routes for fields service
 */
export function fieldsService({ router, routeGuard }: RouteInitialization) {
  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/fields_service/field_cardinality`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetFieldInfo'],
      },
      summary: 'Gets cardinality of fields',
      description:
        'Returns the cardinality of one or more fields. Returns an Object whose keys are the names of the fields, with values equal to the cardinality of the field',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getCardinalityOfFieldsSchema,
          },
          response: {
            200: {
              body: getCardinalityOfFieldsResponse,
              description: 'Cardinality of fields',
            },
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const resp = await getCardinalityOfFields(client, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/fields_service/time_field_range`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetFieldInfo'],
      },
      summary: 'Get time field range',
      description:
        'Returns the time range for the given index and query using the specified time range.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: getTimeFieldRangeSchema,
          },
          response: {
            200: {
              body: getTimeFieldRangeResponse,
              description: 'Cardinality of fields',
            },
          },
        },
      },
      routeGuard.basicLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const resp = await getTimeFieldRange(client, request.body);

          return response.ok({
            body: resp,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );
}
