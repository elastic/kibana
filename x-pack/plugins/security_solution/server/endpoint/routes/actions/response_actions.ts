/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import { responseActionsWithLegacyActionProperty } from '../../services/actions/constants';
import { stringify } from '../../utils/stringify';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from '../../services';
import type { ResponseActionsClient } from '../../services/actions/clients/lib/types';
import { CustomHttpRequestError } from '../../../utils/custom_http_request_error';
import type {
  NoParametersRequestSchema,
  ResponseActionsRequestBody,
  ExecuteActionRequestBody,
  ResponseActionGetFileRequestBody,
  UploadActionApiRequestBody,
} from '../../../../common/api/endpoint';
import {
  ExecuteActionRequestSchema,
  EndpointActionGetFileSchema,
  IsolateRouteRequestSchema,
  KillProcessRouteRequestSchema,
  SuspendProcessRouteRequestSchema,
  UnisolateRouteRequestSchema,
  GetProcessesRouteRequestSchema,
  UploadActionRequestSchema,
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
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  EndpointActionDataParameterTypes,
  ResponseActionParametersWithPidOrEntityId,
  ResponseActionsExecuteParameters,
  ActionDetails,
  KillOrSuspendProcessRequestBody,
} from '../../../../common/endpoint/types';
import type { ResponseActionsApiCommandNames } from '../../../../common/endpoint/service/response_actions/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';

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

  router.versioned
    .post({
      access: 'public',
      path: UPLOAD_ROUTE,
      options: {
        authRequired: true,
        tags: ['access:securitySolution'],
        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
          maxBytes: endpointContext.serverConfig.maxUploadResponseActionFileBytes,
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: UploadActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteFileOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionsExecuteParameters>(endpointContext, 'upload')
      )
    );
}

function responseActionRequestHandler<T extends EndpointActionDataParameterTypes>(
  endpointContext: EndpointAppContext,
  command: ResponseActionsApiCommandNames
): RequestHandler<
  unknown,
  unknown,
  ResponseActionsRequestBody,
  SecuritySolutionRequestHandlerContext
> {
  const logger = endpointContext.logFactory.get('responseActionsHandler');

  return async (context, req, res) => {
    logger.debug(`response action [${command}]:\n${stringify(req.body)}`);

    // Note:  because our API schemas are defined as module static variables (as opposed to a
    //        `getter` function), we need to include this additional validation here, since
    //        `agent_type` is included in the schema independent of the feature flag
    if (
      (req.body.agent_type === 'sentinel_one' &&
        !endpointContext.experimentalFeatures.responseActionsSentinelOneV1Enabled) ||
      (req.body.agent_type === 'crowdstrike' &&
        !endpointContext.experimentalFeatures.responseActionsCrowdstrikeManualHostIsolationEnabled)
    ) {
      return errorHandler(
        logger,
        res,
        new CustomHttpRequestError(`[request body.agent_type]: feature is disabled`, 400)
      );
    }

    const user = endpointContext.service.security?.authc.getCurrentUser(req);
    const esClient = (await context.core).elasticsearch.client.asInternalUser;
    const casesClient = await endpointContext.service.getCasesClient(req);
    const connectorActions = (await context.actions).getActionsClient();
    const responseActionsClient: ResponseActionsClient = getResponseActionsClient(
      req.body.agent_type || 'endpoint',
      {
        esClient,
        casesClient,
        endpointService: endpointContext.service,
        username: user?.username || 'unknown',
        connectorActions: new NormalizedExternalConnectorClient(connectorActions, logger),
      }
    );

    try {
      let action: ActionDetails;

      switch (command) {
        case 'isolate':
          action = await responseActionsClient.isolate(req.body);
          break;

        case 'unisolate':
          action = await responseActionsClient.release(req.body);
          break;

        case 'running-processes':
          action = await responseActionsClient.runningProcesses(req.body);
          break;

        case 'execute':
          action = await responseActionsClient.execute(req.body as ExecuteActionRequestBody);
          break;

        case 'suspend-process':
          action = await responseActionsClient.suspendProcess(
            req.body as KillOrSuspendProcessRequestBody
          );
          break;

        case 'kill-process':
          action = await responseActionsClient.killProcess(
            req.body as KillOrSuspendProcessRequestBody
          );
          break;

        case 'get-file':
          action = await responseActionsClient.getFile(
            req.body as ResponseActionGetFileRequestBody
          );
          break;

        case 'upload':
          action = await responseActionsClient.upload(req.body as UploadActionApiRequestBody);
          break;

        default:
          throw new CustomHttpRequestError(
            `No handler found for response action command: [${command}]`,
            501
          );
      }

      const { action: actionId, ...data } = action;

      // `action` is deprecated, but still returned in order to ensure backwards compatibility
      const legacyResponseData = responseActionsWithLegacyActionProperty.includes(command)
        ? {
            action: actionId ?? data.id ?? '',
          }
        : {};

      return res.ok({
        body: {
          ...legacyResponseData,
          data,
        },
      });
    } catch (err) {
      return errorHandler(logger, res, err);
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
  return async (context, _req, res) => {
    const basePath = (await context.securitySolution).getServerBasePath();
    return res.custom({
      statusCode: 308,
      headers: { location: `${basePath}${location}` },
    });
  };
}
