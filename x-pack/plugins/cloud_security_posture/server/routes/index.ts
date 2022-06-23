/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  CspRequestHandlerContext,
  CspServerPluginStart,
  CspServerPluginStartDeps,
} from '../types';
import { PLUGIN_ID } from '../../common';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineUpdateRulesConfigRoute } from './configuration/update_rules_configuration';
import { defineGetCspSetupStatusRoute } from './status/status';
import { defineEsPitRoute } from './es_pit/es_pit';

export function setupRoutes({
  core,
  logger,
}: {
  core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>;
  logger: Logger;
}) {
  const router = core.http.createRouter<CspRequestHandlerContext>();
  defineGetComplianceDashboardRoute(router);
  defineGetBenchmarksRoute(router);
  defineUpdateRulesConfigRoute(router);
  defineGetCspSetupStatusRoute(router);
  defineEsPitRoute(router);

  core.http.registerRouteHandlerContext<CspRequestHandlerContext, typeof PLUGIN_ID>(
    PLUGIN_ID,
    (context, request) =>
      createCspRouteContext({
        core,
        logger,
        context,
        request,
      })
  );
}

async function createCspRouteContext({
  core,
  logger,
  context,
  request,
}: {
  core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>;
  logger: Logger;
  context: Omit<CspRequestHandlerContext, 'csp'>;
  request: KibanaRequest;
}) {
  const [, { security, fleet }] = await core.getStartServices();

  await fleet.fleetSetupCompleted();

  return {
    logger,
    security,
    fleet: {
      agentPolicyService: fleet.agentPolicyService,
      agentService: fleet.agentService,
      packagePolicyService: fleet.packagePolicyService,
      packageService: fleet.packageService,
    },
  };
}
