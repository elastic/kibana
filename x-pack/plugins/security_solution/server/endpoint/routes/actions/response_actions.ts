/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import { createResponseActionHandler } from './create_response_action_handler';
import type { ResponseActionBodySchema } from '../../../../common/endpoint/schema/actions';
import {
  NoParametersRequestSchema,
  KillOrSuspendProcessRequestSchema,
  EndpointActionGetFileSchema,
} from '../../../../common/endpoint/schema/actions';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
  ENDPOINT_ACTIONS_DS,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  GET_FILE_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  EndpointActionDataParameterTypes,
  ResponseActionParametersWithPidOrEntityId,
} from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { doLogsEndpointActionDsExists } from '../../utils';
import { withEndpointAuthz } from '../with_endpoint_authz';
import type { FeatureKeys } from '../../services/feature_usage/service';

export function registerResponseActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  /**
   * @deprecated use ISOLATE_HOST_ROUTE_V2 instead
   */
  router.post(
    {
      path: ISOLATE_HOST_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz({ all: ['canIsolateHost'] }, logger, redirectHandler(ISOLATE_HOST_ROUTE_V2))
  );

  /**
   * @deprecated use RELEASE_HOST_ROUTE instead
   */
  router.post(
    {
      path: UNISOLATE_HOST_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canUnIsolateHost'] },
      logger,
      redirectHandler(UNISOLATE_HOST_ROUTE_V2)
    )
  );

  router.post(
    {
      path: ISOLATE_HOST_ROUTE_V2,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canIsolateHost'] },
      logger,
      responseActionRequestHandler(endpointContext, 'isolate')
    )
  );

  router.post(
    {
      path: UNISOLATE_HOST_ROUTE_V2,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canUnIsolateHost'] },
      logger,
      responseActionRequestHandler(endpointContext, 'unisolate')
    )
  );

  router.post(
    {
      path: KILL_PROCESS_ROUTE,
      validate: KillOrSuspendProcessRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canKillProcess'] },
      logger,
      responseActionRequestHandler<ResponseActionParametersWithPidOrEntityId>(
        endpointContext,
        'kill-process'
      )
    )
  );

  router.post(
    {
      path: SUSPEND_PROCESS_ROUTE,
      validate: KillOrSuspendProcessRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canSuspendProcess'] },
      logger,
      responseActionRequestHandler<ResponseActionParametersWithPidOrEntityId>(
        endpointContext,
        'suspend-process'
      )
    )
  );

  router.post(
    {
      path: GET_PROCESSES_ROUTE,
      validate: NoParametersRequestSchema,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    },
    withEndpointAuthz(
      { all: ['canGetRunningProcesses'] },
      logger,
      responseActionRequestHandler(endpointContext, 'running-processes')
    )
  );

  // `get-file` currently behind FF
  if (endpointContext.experimentalFeatures.responseActionGetFileEnabled) {
    router.post(
      {
        path: GET_FILE_ROUTE,
        validate: EndpointActionGetFileSchema,
        options: { authRequired: true, tags: ['access:securitySolution'] },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler(endpointContext, 'get-file')
      )
    );
  }
}

const commandToFeatureKeyMap = new Map<ResponseActionsApiCommandNames, FeatureKeys>([
  ['isolate', 'HOST_ISOLATION'],
  ['unisolate', 'HOST_ISOLATION'],
  ['kill-process', 'KILL_PROCESS'],
  ['suspend-process', 'SUSPEND_PROCESS'],
  ['running-processes', 'RUNNING_PROCESSES'],
  ['get-file', 'GET_FILE'],
]);

function responseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: ResponseActionsApiCommandNames
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof ResponseActionBodySchema>,
  SecuritySolutionRequestHandlerContext
> {
  return async (context, req, res) => {
    const featureKey = commandToFeatureKeyMap.get(command) as FeatureKeys;
    if (featureKey) {
      endpointContext.service.getFeatureUsageService().notifyUsage(featureKey);
    }
    const user = endpointContext.service.security?.authc.getCurrentUser(req);

    const casesClient = await endpointContext.service.getCasesClient(req);

    // if .logs-endpoint.actions data stream exists
    // try to create action request record in .logs-endpoint.actions DS as the current user
    // (from >= v7.16, use this check to ensure the current user has privileges to write to the new index)
    // and allow only users with superuser privileges to write to fleet indices
    const logger = endpointContext.logFactory.get('host-isolation');
    const doesLogsEndpointActionsDsExist = await doLogsEndpointActionDsExists({
      context,
      logger,
      dataStreamName: ENDPOINT_ACTIONS_DS,
    });

    // 8.0+ requires internal user to write to system indices

    try {
      const { body, data } = await createResponseActionHandler(endpointContext, req.body, {
        casesClient,
        command,
        doesLogsEndpointActionsDsExist,
        metadata: { currentUser: user },
      });

      return res.ok({
        body: {
          ...body,
          data,
        },
      });
    } catch (error) {
      return res.customError({
        statusCode: 500,
        body: error,
      });
    }
  };
}

function redirectHandler(
  location: string
): RequestHandler<
  unknown,
  unknown,
  TypeOf<typeof NoParametersRequestSchema.body>,
  SecuritySolutionRequestHandlerContext
> {
  return async (_context, _req, res) => {
    return res.custom({
      statusCode: 308,
      headers: { location },
    });
  };
}
