/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  CustomRequestHandlerContext,
  CoreRequestHandlerContext,
  KibanaRequest,
} from '@kbn/core/server';
import type { ActionsApiRequestHandlerContext } from '@kbn/actions-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { FleetRequestHandlerContext } from '@kbn/fleet-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { ListsApiRequestHandlerContext, ExceptionListClient } from '@kbn/lists-plugin/server';
import type { IRuleDataService, AlertsClient } from '@kbn/rule-registry-plugin/server';

import type { Immutable } from '../common/endpoint/types';
import type { CreateQueryRuleAdditionalOptions } from './lib/detection_engine/rule_types/types';
import { AppClient } from './client';
import type { ConfigType } from './config';
import type { IRuleExecutionLogForRoutes } from './lib/detection_engine/rule_monitoring';
import type { FrameworkRequest } from './lib/framework';
import type { EndpointAuthz } from '../common/endpoint/types/authz';
import type {
  EndpointInternalFleetServicesInterface,
  EndpointScopedFleetServicesInterface,
} from './endpoint/services/fleet';

export { AppClient };

export interface SecuritySolutionApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  getEndpointAuthz: () => Promise<Immutable<EndpointAuthz>>;
  getConfig: () => ConfigType;
  getFrameworkRequest: () => FrameworkRequest;
  getAppClient: () => AppClient;
  getSpaceId: () => string;
  getRuleDataService: () => IRuleDataService;
  getRuleExecutionLog: () => IRuleExecutionLogForRoutes;
  getRacClient: (req: KibanaRequest) => Promise<AlertsClient>;
  getExceptionListClient: () => ExceptionListClient | null;
  getInternalFleetServices: () => EndpointInternalFleetServicesInterface;
  getScopedFleetServices: (req: KibanaRequest) => EndpointScopedFleetServicesInterface;
  getQueryRuleAdditionalOptions: CreateQueryRuleAdditionalOptions;
}

export type SecuritySolutionRequestHandlerContext = CustomRequestHandlerContext<{
  securitySolution: SecuritySolutionApiRequestHandlerContext;
  actions: ActionsApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  licensing: LicensingApiRequestHandlerContext;
  lists?: ListsApiRequestHandlerContext;
  fleet?: FleetRequestHandlerContext['fleet'];
}>;

export type SecuritySolutionPluginRouter = IRouter<SecuritySolutionRequestHandlerContext>;
