/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { getUnallowedFieldValues } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_UNALLOWED_FIELD_VALUES, INTERNAL_API_VERSION } from '../../common/constants';
import { buildRouteValidation } from '../schemas/common';
import { GetUnallowedFieldValuesBody } from '../schemas/get_unallowed_field_values';
import { API_DEFAULT_ERROR_MESSAGE } from '../translations';

export const getUnallowedFieldValuesRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .post({
      path: GET_UNALLOWED_FIELD_VALUES,
      access: 'internal',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { body: buildRouteValidation(GetUnallowedFieldValuesBody) } },
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
          logger.error(JSON.stringify(err));

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
