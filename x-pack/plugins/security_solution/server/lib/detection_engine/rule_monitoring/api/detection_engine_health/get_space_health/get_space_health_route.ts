/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';

import type { GetSpaceHealthResponse } from '../../../../../../../common/detection_engine/rule_monitoring';
import {
  GET_SPACE_HEALTH_URL,
  GetSpaceHealthRequestBody,
} from '../../../../../../../common/detection_engine/rule_monitoring';

/**
 * Get health overview of the current Kibana space. Scope: all detection rules in the space.
 * Returns:
 *   - current health stats at the moment of the API call
 *   - health history over a given period of time
 */
export const getSpaceHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: GET_SPACE_HEALTH_URL,
      validate: {
        body: buildRouteValidation(GetSpaceHealthRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);

        const responseBody: GetSpaceHealthResponse = {
          foo: 'bar',
        };

        return response.ok({ body: responseBody });
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
