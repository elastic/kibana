/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { getExceptionFilterSchema } from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_EXCEPTIONS } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';

export const getExceptionFilterRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_EXCEPTIONS}/_create_filter`,
      validate: {
        body: buildRouteValidation(getExceptionFilterSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const listContext = await context.lists;
      const listClient = listContext?.getListClient();

      try {
        const {} = request.body;

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
