/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  ResponseActionBodySchema,
  NoParametersRequestSchema,
} from '../../../../common/api/endpoint';
import {
  ExecuteActionRequestSchema,
  EndpointActionGetFileSchema,
  IsolateRouteRequestSchema,
  KillProcessRouteRequestSchema,
  SuspendProcessRouteRequestSchema,
  UnisolateRouteRequestSchema,
  GetProcessesRouteRequestSchema,
} from '../../../../common/api/endpoint';

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
  HostMetadata,
} from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { registerActionFileUploadRoute } from './file_upload_handler';
import { updateCases } from '../../services/actions/create/update_cases';

export function registerResponseActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  /**
   * @deprecated use ISOLATE_HOST_ROUTE_V2 instead
   */
  router.versioned
    .post({
      access: 'public',
      path: ISOLATE_HOST_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: IsolateRouteRequestSchema,
        },
      },
      withEndpointAuthz({ all: ['canIsolateHost'] }, logger, redirectHandler(ISOLATE_HOST_ROUTE_V2))
    );

  /**
   * @deprecated use RELEASE_HOST_ROUTE instead
   */
  router.versioned
    .post({
      access: 'public',
      path: UNISOLATE_HOST_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UnisolateRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canUnIsolateHost'] },
        logger,
        redirectHandler(UNISOLATE_HOST_ROUTE_V2)
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: ISOLATE_HOST_ROUTE_V2,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: IsolateRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canIsolateHost'] },
        logger,
        responseActionRequestHandler(endpointContext, 'isolate')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: UNISOLATE_HOST_ROUTE_V2,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UnisolateRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canUnIsolateHost'] },
        logger,
        responseActionRequestHandler(endpointContext, 'unisolate')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: KILL_PROCESS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: KillProcessRouteRequestSchema,
        },
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

  router.versioned
    .post({
      access: 'public',
      path: SUSPEND_PROCESS_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: SuspendProcessRouteRequestSchema,
        },
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

  router.versioned
    .post({
      access: 'public',
      path: GET_PROCESSES_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: GetProcessesRouteRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canGetRunningProcesses'] },
        logger,
        responseActionRequestHandler(endpointContext, 'running-processes')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: GET_FILE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: EndpointActionGetFileSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler(endpointContext, 'get-file')
      )
    );

  router.versioned
    .post({
      access: 'public',
      path: EXECUTE_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ExecuteActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteExecuteOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'execute')
      )
    );

  registerActionFileUploadRoute(router, endpointContext);
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
    const esClient = (await context.core).elasticsearch.client.asInternalUser;

    let action: ActionDetails;

    try {
      const createActionPayload = { ...req.body, command, user };
      const endpointData = await endpointContext.service
        .getEndpointMetadataService()
        .getMetadataForEndpoints(esClient, [...new Set(createActionPayload.endpoint_ids)]);
      const agentIds = endpointData.map((endpoint: HostMetadata) => endpoint.elastic.agent.id);

      action = await endpointContext.service
        .getActionCreateService()
        .createAction(createActionPayload, agentIds);

      // update cases
      const casesClient = await endpointContext.service.getCasesClient(req);
      await updateCases({ casesClient, createActionPayload, endpointData });
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
  return async (context, _req, res) => {
    const basePath = (await context.securitySolution).getServerBasePath();
    return res.custom({
      statusCode: 308,
      headers: { location: `${basePath}${location}` },
    });
  };
}
