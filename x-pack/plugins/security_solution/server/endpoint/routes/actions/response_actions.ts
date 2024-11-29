/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { responseActionRequestHandler } from './response_actions_handler';
import {
  EndpointActionGetFileSchema,
  ExecuteActionRequestSchema,
  GetProcessesRouteRequestSchema,
  IsolateRouteRequestSchema,
  KillProcessRouteRequestSchema,
  ScanActionRequestSchema,
  SuspendProcessRouteRequestSchema,
  UnisolateRouteRequestSchema,
  UploadActionRequestSchema,
} from '../../../../common/api/endpoint';

import {
  CROWDSTRIKE_RUN_SCRIPT_ROUTE,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from '../../../../common/endpoint/constants';
import type {
  ResponseActionParametersWithProcessData,
  ResponseActionsExecuteParameters,
  ResponseActionScanParameters,
} from '../../../../common/endpoint/types';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

export function registerResponseActionRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) {
  const logger = endpointContext.logFactory.get('hostIsolation');

  router.versioned
    .post({
      access: 'public',
      path: ISOLATE_HOST_ROUTE_V2,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        authRequired: true,

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
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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

  router.versioned
    .post({
      access: 'public',
      path: CROWDSTRIKE_RUN_SCRIPT_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
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
}
