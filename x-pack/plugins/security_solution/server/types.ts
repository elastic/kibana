/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { IRouter, RequestHandlerContext } from 'src/core/server';
import type { ListsApiRequestHandlerContext } from '../../lists/server';
import type { LicensingApiRequestHandlerContext } from '../../licensing/server';
import type { AlertingApiRequestHandlerContext } from '../../alerts/server';

import { AppClient } from './client';

export { AppClient };

export interface AppRequestContext {
  getAppClient: () => AppClient;
}

export type SecuritySolutionRequestHandlerContext = RequestHandlerContext & {
  securitySolution: AppRequestContext;
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
};

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;
