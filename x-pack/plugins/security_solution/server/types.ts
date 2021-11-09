/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { ActionsApiRequestHandlerContext } from '../../actions/server';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
import type { ListsApiRequestHandlerContext, ExceptionListClient } from '../../lists/server';
import type { IRuleDataService } from '../../rule_registry/server';

import { AppClient } from './client';
import { ConfigType } from './config';
import { IRuleExecutionLogClient } from './lib/detection_engine/rule_execution_log/types';
import { FrameworkRequest } from './lib/framework';

export { AppClient };

export interface SecuritySolutionApiRequestHandlerContext extends RequestHandlerContext {
  getConfig: () => ConfigType;
  getFrameworkRequest: () => FrameworkRequest;
  getAppClient: () => AppClient;
  getSpaceId: () => string;
  getRuleDataService: () => IRuleDataService;
  getExecutionLogClient: () => IRuleExecutionLogClient;
  getExceptionListClient: () => ExceptionListClient | null;
}

export interface SecuritySolutionRequestHandlerContext extends RequestHandlerContext {
  securitySolution: SecuritySolutionApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
}

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;
