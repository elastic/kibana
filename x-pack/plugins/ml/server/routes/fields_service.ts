/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import {
  getCardinalityOfFieldsSchema,
  getTimeFieldRangeSchema,
} from './schemas/fields_service_schema';
import { fieldsServiceProvider } from '../models/fields_service';

function getCardinalityOfFields(context: RequestHandlerContext, payload: any) {
  const fs = fieldsServiceProvider(context.ml!.mlClient);
  const { index, fieldNames, query, timeFieldName, earliestMs, latestMs } = payload;
  return fs.getCardinalityOfFields(index, fieldNames, query, timeFieldName, earliestMs, latestMs);
}

function getTimeFieldRange(context: RequestHandlerContext, payload: any) {
  const fs = fieldsServiceProvider(context.ml!.mlClient);
  const { index, timeFieldName, query } = payload;
  return fs.getTimeFieldRange(index, timeFieldName, query);
}

/**
 * Routes for fields service
 */
export function fieldsService({ router, mlLicense }: RouteInitialization) {
  /**
   * @apiGroup FieldsService
   *
   * @api {post} /api/ml/fields_service/field_cardinality Get cardinality of fields
   * @apiName GetCardinalityOfFields
   * @apiDescription Returns the cardinality of one or more fields. Returns an Object whose keys are the names of the fields, with values equal to the cardinality of the field
   *
   * @apiSchema (body) getCardinalityOfFieldsSchema
   *
   * @apiSuccess {number} fieldName cardinality of the field.
   */
  router.post(
    {
      path: '/api/ml/fields_service/field_cardinality',
      validate: {
        body: getCardinalityOfFieldsSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    mlLicense.fullLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getCardinalityOfFields(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup FieldsService
   *
   * @api {post} /api/ml/fields_service/time_field_range Get time field range
   * @apiName GetTimeFieldRange
   * @apiDescription Returns the time range for the given index and query using the specified time range.
   *
   * @apiSchema (body) getTimeFieldRangeSchema
   *
   * @apiSuccess {Object} start start of time range with epoch and string properties.
   * @apiSuccess {Object} end end of time range with epoch and string properties.
   */
  router.post(
    {
      path: '/api/ml/fields_service/time_field_range',
      validate: {
        body: getTimeFieldRangeSchema,
      },
      options: {
        tags: ['access:ml:canAccessML'],
      },
    },
    mlLicense.basicLicenseAPIGuard(async (context, request, response) => {
      try {
        const resp = await getTimeFieldRange(context, request.body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
