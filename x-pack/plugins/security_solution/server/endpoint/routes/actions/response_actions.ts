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
  KillProcessRequestBody,
  SuspendProcessRequestBody,
} from '../../../../common/api/endpoint';
import {
  EndpointActionGetFileSchema,
  type ExecuteActionRequestBody,
  ExecuteActionRequestSchema,
  GetProcessesRouteRequestSchema,
  IsolateRouteRequestSchema,
  KillProcessRouteRequestSchema,
  type NoParametersRequestSchema,
  type ResponseActionGetFileRequestBody,
  type ResponseActionsRequestBody,
  type ScanActionRequestBody,
  ScanActionRequestSchema,
  SuspendProcessRouteRequestSchema,
  UnisolateRouteRequestSchema,
  type UploadActionApiRequestBody,
  UploadActionRequestSchema,
} from '../../../../common/api/endpoint';

import {
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  EndpointActionDataParameterTypes,
  ResponseActionParametersWithProcessData,
  ResponseActionsExecuteParameters,
  ResponseActionScanParameters,
} from '../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
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
        responseActionRequestHandler<ResponseActionParametersWithProcessData>(
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
        responseActionRequestHandler<ResponseActionParametersWithProcessData>(
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

  router.versioned
    .post({
      access: 'public',
      path: SCAN_ROUTE,
      options: { authRequired: true, tags: ['access:securitySolution'] },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: ScanActionRequestSchema,
        },
      },
      withEndpointAuthz(
        { all: ['canWriteScanOperations'] },
        logger,
        responseActionRequestHandler<ResponseActionScanParameters>(endpointContext, 'scan')
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
    logger.debug(() => `response action [${command}]:\n${stringify(req.body)}`);

    const experimentalFeatures = endpointContext.experimentalFeatures;

    // Note:  because our API schemas are defined as module static variables (as opposed to a
    //        `getter` function), we need to include this additional validation here, since
    //        `agent_type` is included in the schema independent of the feature flag
    if (isThirdPartyFeatureDisabled(req.body.agent_type, experimentalFeatures)) {
      return errorHandler(
        logger,
        res,
        new CustomHttpRequestError(`[request body.agent_type]: feature is disabled`, 400)
      );
    }

    const coreContext = await context.core;
    const user = coreContext.security.authc.getCurrentUser();
    const esClient = coreContext.elasticsearch.client.asInternalUser;
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
      const action: ActionDetails = await handleActionCreation(
        command,
        req.body,
        responseActionsClient
      );
      const { action: actionId, ...data } = action;
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

function isThirdPartyFeatureDisabled(
  agentType: ResponseActionAgentType | undefined,
  experimentalFeatures: EndpointAppContext['experimentalFeatures']
): boolean {
  return (
    (agentType === 'sentinel_one' && !experimentalFeatures.responseActionsSentinelOneV1Enabled) ||
    (agentType === 'crowdstrike' &&
      !experimentalFeatures.responseActionsCrowdstrikeManualHostIsolationEnabled)
  );
}

async function handleActionCreation(
  command: ResponseActionsApiCommandNames,
  body: ResponseActionsRequestBody,
  responseActionsClient: ResponseActionsClient
): Promise<ActionDetails> {
  switch (command) {
    case 'isolate':
      return responseActionsClient.isolate(body);
    case 'unisolate':
      return responseActionsClient.release(body);
    case 'running-processes':
      return responseActionsClient.runningProcesses(body);
    case 'execute':
      return responseActionsClient.execute(body as ExecuteActionRequestBody);
    case 'suspend-process':
      return responseActionsClient.suspendProcess(body as SuspendProcessRequestBody);
    case 'kill-process':
      return responseActionsClient.killProcess(body as KillProcessRequestBody);
    case 'get-file':
      return responseActionsClient.getFile(body as ResponseActionGetFileRequestBody);
    case 'upload':
      return responseActionsClient.upload(body as UploadActionApiRequestBody);
    case 'scan':
      return responseActionsClient.scan(body as ScanActionRequestBody);
    default:
      throw new CustomHttpRequestError(
        `No handler found for response action command: [${command}]`,
        501
      );
  }
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
