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

import type { GetClusterHealthResponse } from '../../../../../../../common/detection_engine/rule_monitoring';
import {
  GET_CLUSTER_HEALTH_URL,
  GetClusterHealthRequestBody,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import { calculateHealthTimings } from '../health_timings';
import { validateGetClusterHealthRequest } from './get_cluster_health_request';

/**
 * Get health overview of the whole cluster. Scope: all detection rules in all Kibana spaces.
 * Returns:
 * - health stats at the moment of the API call
 * - health stats over a specified period of time ("health interval")
 * - health stats history within the same interval in the form of a histogram
 *   (the same stats are calculated over each of the discreet sub-intervals of the whole interval)
 */
export const getClusterHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: GET_CLUSTER_HEALTH_URL,
      validate: {
        body: buildRouteValidation(GetClusterHealthRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const params = validateGetClusterHealthRequest(request.body);

        const ctx = await context.resolve(['securitySolution']);
        const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();

        const clusterHealthParameters = { interval: params.interval };
        const clusterHealth = await healthClient.calculateClusterHealth(clusterHealthParameters);

        const responseBody: GetClusterHealthResponse = {
          // TODO: https://github.com/elastic/kibana/issues/125642 Implement the endpoint and remove the `message` property
          message: 'Not implemented',
          timings: calculateHealthTimings(params.requestReceivedAt),
          parameters: clusterHealthParameters,
          health: {
            ...clusterHealth,
            debug: params.debug ? clusterHealth.debug : undefined,
          },
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
