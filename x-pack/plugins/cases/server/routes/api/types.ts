/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  PluginInitializerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
  RouteValidatorConfig,
} from 'kibana/server';

import { UsageCollectionSetup } from '../../../../../../src/plugins/usage_collection/server';
import type { CasesRequestHandlerContext, CasesRouter } from '../../types';

type TelemetryUsageCounter = ReturnType<UsageCollectionSetup['createUsageCounter']>;

export interface RegisterRoutesDeps {
  router: CasesRouter;
  routes: CaseRoute[];
  logger: Logger;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  telemetryUsageCounter?: TelemetryUsageCounter;
}

export interface TotalCommentByCase {
  caseId: string;
  totalComments: number;
}

interface CaseRouteHandlerArguments<P, Q, B> {
  request: KibanaRequest<P, Q, B>;
  context: CasesRequestHandlerContext;
  response: KibanaResponseFactory;
  logger: Logger;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
}

export interface CaseRoute<P = unknown, Q = unknown, B = unknown> {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  params?: RouteValidatorConfig<P, Q, B>;
  options?: { deprecated?: boolean };
  handler: (args: CaseRouteHandlerArguments<P, Q, B>) => Promise<IKibanaResponse>;
}
