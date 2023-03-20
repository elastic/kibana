/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import {
  NoParametersRequestSchema,
  KillOrSuspendProcessRequestSchema,
  EndpointActionGetFileSchema,
  ExecuteActionRequestSchema,
  type ResponseActionBodySchema,
} from '../../../../common/endpoint/schema/actions';
import {
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE,
  GET_FILE_ROUTE,
  EXECUTE_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  EndpointActionDataParameterTypes,
  ResponseActionParametersWithPidOrEntityId,
  ResponseActionsExecuteParameters,
  ActionDetails,
} from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

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

  // `execute` currently behind FF (planned for 8.8)
  if (endpointContext.experimentalFeatures.responseActionExecuteEnabled) {
    router.post(
      {
        path: EXECUTE_ROUTE,
        validate: ExecuteActionRequestSchema,
        options: { authRequired: true, tags: ['access:securitySolution'] },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'execute')
      )
    );
  }
}

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
    const user = endpointContext.service.security?.authc.getCurrentUser(req);

    const casesClient = await endpointContext.service.getCasesClient(req);
    let action: ActionDetails;

    try {
      action = await endpointContext.service
        .getActionCreateService()
        .createAction({ ...req.body, command, user }, casesClient);
    } catch (err) {
      return res.customError({
        statusCode: 500,
        body: err,
      });
    }

    const { action: actionId, ...data } = action;
    return res.ok({
      body: {
        action: actionId,
        data,
      },
    });
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
