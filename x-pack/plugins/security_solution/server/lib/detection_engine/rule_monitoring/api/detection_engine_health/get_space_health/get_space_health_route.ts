/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';

import type {
  GetSpaceHealthRequest,
  GetSpaceHealthResponse,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import {
  GET_SPACE_HEALTH_URL,
  GetSpaceHealthRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { IDetectionEngineHealthClient } from '../../../logic/detection_engine_health';
import { calculateHealthTimings } from '../health_timings';
import { validateGetSpaceHealthRequest } from './get_space_health_request';

/**
 * Get health overview of the current Kibana space. Scope: all detection rules in the space.
 * Returns:
 * - health state at the moment of the API call
 * - health stats over a specified period of time ("health interval")
 * - health stats history within the same interval in the form of a histogram
 *   (the same stats are calculated over each of the discreet sub-intervals of the whole interval)
 */
export const getSpaceHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_SPACE_HEALTH_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response): Promise<IKibanaResponse<GetSpaceHealthResponse>> => {
        return handleSpaceHealthRequest({
          response,
          resolveParameters: () => validateGetSpaceHealthRequest({}),
          resolveDependencies: async () => {
            const ctx = await context.resolve(['securitySolution']);
            const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();
            return { healthClient };
          },
        });
      }
    );

  router.versioned
    .post({
      access: 'internal',
      path: GET_SPACE_HEALTH_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidation(GetSpaceHealthRequestBody),
          },
        },
      },
      async (context, request, response) => {
        return handleSpaceHealthRequest({
          response,
          resolveParameters: () => validateGetSpaceHealthRequest(request.body),
          resolveDependencies: async () => {
            const ctx = await context.resolve(['securitySolution']);
            const healthClient = ctx.securitySolution.getDetectionEngineHealthClient();
            return { healthClient };
          },
        });
      }
    );
};

interface SpaceHealthRouteDependencies {
  healthClient: IDetectionEngineHealthClient;
}

interface HandleSpaceHealthRequestArgs {
  response: KibanaResponseFactory;
  resolveParameters: () => GetSpaceHealthRequest;
  resolveDependencies: () => Promise<SpaceHealthRouteDependencies>;
}

const handleSpaceHealthRequest = async (args: HandleSpaceHealthRequestArgs) => {
  const { response, resolveParameters, resolveDependencies } = args;
  const siemResponse = buildSiemResponse(response);

  try {
    const params = resolveParameters();
    const { healthClient } = await resolveDependencies();

    const spaceHealthParameters = { interval: params.interval };
    const spaceHealth = await healthClient.calculateSpaceHealth(spaceHealthParameters);

    const responseBody: GetSpaceHealthResponse = {
      timings: calculateHealthTimings(params.requestReceivedAt),
      parameters: spaceHealthParameters,
      health: {
        ...spaceHealth,
        debug: params.debug ? spaceHealth.debug : undefined,
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
};
