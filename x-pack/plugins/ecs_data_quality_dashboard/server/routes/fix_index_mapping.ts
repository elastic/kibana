/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { FIX_INDEX_MAPPING } from '../../common/constants';
import { buildResponse } from '../lib/build_response';
import { fixIndexMapping } from '../lib/fix_index_mapping';
import { buildRouteValidation } from '../schemas/common';
import { FixIndexMappingBody } from '../schemas/fix_index_mapping';

export const fixIndexMappingRoute = (router: IRouter) => {
  router.post(
    {
      path: FIX_INDEX_MAPPING,
      validate: { body: buildRouteValidation(FixIndexMappingBody) },
    },
    async (context, request, response) => {
      const resp = buildResponse(response);
      const { client } = (await context.core).elasticsearch;
      try {
        const options = request.body;

        const result = await fixIndexMapping(client, options);
        return response.ok({
          body: result,
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
