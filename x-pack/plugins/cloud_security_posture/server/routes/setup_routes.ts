/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE } from '../../common/constants';
import type {
  CspRequestHandlerContext,
  CspServerPluginStart,
  CspServerPluginStartDeps,
} from '../types';
import { PLUGIN_ID } from '../../common';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard/compliance_dashboard';
import { defineGetVulnerabilitiesDashboardRoute } from './vulnerabilities_dashboard/vulnerabilities_dashboard';
import { defineGetBenchmarksRoute } from './benchmarks/benchmarks';
import { defineGetCspStatusRoute } from './status/status';
import { defineFindCspBenchmarkRuleRoute } from './benchmark_rules/find/find';
import { defineGetDetectionEngineAlertsStatus } from './detection_engine/get_detection_engine_alerts_count_by_rule_tags';
import { defineBulkActionCspBenchmarkRulesRoute } from './benchmark_rules/bulk_action/bulk_action';
import { defineGetCspBenchmarkRulesStatesRoute } from './benchmark_rules/get_states/get_states';

const CDR_SPACE_ID_PREFIX = 'findings-misconfigurations-cdr';
const CDR_INDEX_PATTERN =
  'logs-*_latest_misconfigurations_cdr,logs-cloud_security_posture.findings_latest-default, my_index, latest';

/**
 * 1. Registers routes
 * 2. Registers routes handler context
 */
export function setupRoutes({
  core,
  logger,
  isPluginInitialized,
}: {
  core: CoreSetup<CspServerPluginStartDeps, CspServerPluginStart>;
  logger: Logger;
  isPluginInitialized(): boolean;
}) {
  const router = core.http.createRouter<CspRequestHandlerContext>();
  defineGetComplianceDashboardRoute(router);
  defineGetVulnerabilitiesDashboardRoute(router);
  defineGetBenchmarksRoute(router);
  defineGetCspStatusRoute(router);
  defineFindCspBenchmarkRuleRoute(router);
  defineGetDetectionEngineAlertsStatus(router);
  defineBulkActionCspBenchmarkRulesRoute(router);
  defineGetCspBenchmarkRulesStatesRoute(router);

  core.http.registerOnPreRouting(async (request, response, toolkit) => {
    if (request.url.pathname === '/internal/cloud_security_posture/status') {
      const [coreStart, startDeps] = await core.getStartServices();
      // check if space id already exists

      setupDataViews(coreStart, startDeps, request);
    }

    return toolkit.next();
  });

  core.http.registerRouteHandlerContext<CspRequestHandlerContext, typeof PLUGIN_ID>(
    PLUGIN_ID,
    async (context, request) => {
      const [, { security, fleet }] = await core.getStartServices();
      const coreContext = await context.core;
      await fleet.fleetSetupCompleted();

      let user: AuthenticatedUser | null = null;

      return {
        get user() {
          // We want to call getCurrentUser only when needed and only once
          if (!user) {
            user = security.authc.getCurrentUser(request);
          }
          return user;
        },
        logger,
        esClient: coreContext.elasticsearch.client,
        soClient: coreContext.savedObjects.client,
        encryptedSavedObjects: coreContext.savedObjects.getClient({
          includedHiddenTypes: [INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE],
        }),
        agentPolicyService: fleet.agentPolicyService,
        agentService: fleet.agentService,
        packagePolicyService: fleet.packagePolicyService,
        packageService: fleet.packageService,
        isPluginInitialized,
      };
    }
  );
}

const setupDataViews = async (
  coreStart: CoreStart,
  startDeps: CspServerPluginStartDeps,
  request: KibanaRequest
) => {
  console.log('Starting to setup data views');

  const soClient = coreStart.savedObjects.createInternalRepository();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  try {
    const currentSpaceId = (await startDeps.spaces?.spacesService.getSpaceId(request)) || 'default';
    console.log(`Current space ID: ${currentSpaceId}`);

    const dataViewsClient = await startDeps.dataViews.dataViewsServiceFactory(
      soClient,
      esClient,
      request,
      true
    );

    const dataViewId = `${CDR_SPACE_ID_PREFIX}-${currentSpaceId}`;

    // // TODO: for some reason it returns data views from the default space
    const allDataviews = await dataViewsClient.getIdsWithTitle();

    if (allDataviews.find((dv) => dv.title === CDR_INDEX_PATTERN)) {
      console.log('Data view already exists, skipping setup');
      return;
    }

    console.log(`Creating and saving data view with ID: ${dataViewId}`);

    // // TODO: uses user permissions to create the data view instead the kibana system permissions
    await dataViewsClient.createAndSave(
      {
        id: dataViewId,
        title: CDR_INDEX_PATTERN,
        name: dataViewId,
        namespaces: [currentSpaceId],
        allowNoIndex: true,
        timeFieldName: '@timestamp',
      },
      true
    );

    console.log('Data view setup completed successfully');
  } catch (error) {
    console.error('Failed to setup data views', error);
    throw error; // Rethrow the error after logging
  }
};
