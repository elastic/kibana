/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { FleetRequestHandlerContext } from '@kbn/fleet-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { ListsApiRequestHandlerContext, ExceptionListClient } from '@kbn/lists-plugin/server';
import type { IRuleDataService } from '@kbn/rule-registry-plugin/server';

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
