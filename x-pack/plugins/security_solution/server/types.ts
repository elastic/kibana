/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { ListsApiRequestHandlerContext } from '../../lists/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
import type { AlertingApiRequestHandlerContext } from '../../alerting/server';

import { AppClient } from './client';
import { RuleExecutionLogClient } from './lib/detection_engine/rule_execution_log/rule_execution_log_client';

export { AppClient };

export interface AppRequestContext {
  getAppClient: () => AppClient;
  getSpaceId: () => string;
  getExecutionLogClient: () => RuleExecutionLogClient;
}

export type SecuritySolutionRequestHandlerContext = RequestHandlerContext & {
  securitySolution: AppRequestContext;
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
};

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;
