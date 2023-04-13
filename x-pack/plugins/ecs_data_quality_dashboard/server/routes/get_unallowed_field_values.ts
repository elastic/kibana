/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { getUnallowedFieldValues } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_UNALLOWED_FIELD_VALUES } from '../../common/constants';
import { buildRouteValidation } from '../schemas/common';
import { GetUnallowedFieldValuesBody } from '../schemas/get_unallowed_field_values';

export const getUnallowedFieldValuesRoute = (router: IRouter) => {
  router.post(
    {
      path: GET_UNALLOWED_FIELD_VALUES,
      validate: { body: buildRouteValidation(GetUnallowedFieldValuesBody) },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      try {
        const items = request.body;

        const { responses } = await getUnallowedFieldValues(esClient, items);
        return response.ok({
          body: responses,
        });
      } catch (err) {
        const error = transformError(err);

        return resp.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
