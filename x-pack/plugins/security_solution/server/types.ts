/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { ActionsApiRequestHandlerContext } from '../../actions/server';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';
import type { FleetRequestHandlerContext } from '../../fleet/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
import type { ListsApiRequestHandlerContext, ExceptionListClient } from '../../lists/server';
import type { IRuleDataService } from '../../rule_registry/server';

import { AppClient } from './client';
import { ConfigType } from './config';
import { IRuleExecutionLogForRoutes } from './lib/detection_engine/rule_execution_log';
import { FrameworkRequest } from './lib/framework';
import { EndpointAuthz } from '../common/endpoint/types/authz';

export { AppClient };

export interface SecuritySolutionApiRequestHandlerContext extends RequestHandlerContext {
  endpointAuthz: EndpointAuthz;
  getConfig: () => ConfigType;
  getFrameworkRequest: () => FrameworkRequest;
  getAppClient: () => AppClient;
  getSpaceId: () => string;
  getRuleDataService: () => IRuleDataService;
  getRuleExecutionLog: () => IRuleExecutionLogForRoutes;
  getExceptionListClient: () => ExceptionListClient | null;
}

export interface SecuritySolutionRequestHandlerContext extends RequestHandlerContext {
  securitySolution: SecuritySolutionApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
  fleet?: FleetRequestHandlerContext['fleet'];
}

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;
