/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { enableResourceManagement, setMaximumBuckets } from '../lib/setup/cluster_settings';
import {
  createCollectorPackagePolicy,
  createSymbolizerPackagePolicy,
  removeProfilingFromApmPackagePolicy,
} from '../lib/setup/fleet_policies';
import { getSetupInstructions } from '../lib/setup/get_setup_instructions';
import { setSecurityRole } from '../lib/setup/security_role';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getClient } from './compat';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  // Check if Elasticsearch and Fleet are set up for Universal Profiling
  router.get(
    {
      path: paths.HasSetupESResources,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        const core = await context.core;

        const profilingStatus = await dependencies.start.profilingDataAccess.services.getStatus({
          esClient,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces?.spacesService?.getSpaceId(request),
        });

        return response.ok({ body: profilingStatus });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while checking plugin setup',
        });
      }
    }
  );
  // Set up Elasticsearch and Fleet for Universal Profiling
  router.post(
    {
      path: paths.HasSetupESResources,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const isCloudEnabled = dependencies.setup.cloud.isCloudEnabled;

        if (!isCloudEnabled) {
          const msg = `Elastic Cloud is required to set up Elasticsearch and Fleet for Universal Profiling`;
          logger.error(msg);
          return response.custom({
            statusCode: 500,
            body: {
              message: msg,
            },
          });
        }

        const esClient = await getClient(context);
        const core = await context.core;
        const clientWithDefaultAuth = createProfilingEsClient({
          esClient,
          request,
          useDefaultAuth: true,
        });
        const clientWithProfilingAuth = createProfilingEsClient({
          esClient,
          request,
          useDefaultAuth: false,
        });

        const commonParams = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId:
            dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
          isCloudEnabled,
        };

        const setupState = await dependencies.start.profilingDataAccess.services.getSetupState(
          commonParams,
          clientWithProfilingAuth
        );

        const executeAdminFunctions = [
          ...(setupState.resource_management.enabled ? [] : [enableResourceManagement]),
          ...(setupState.permissions.configured ? [] : [setSecurityRole]),
          ...(setupState.settings.configured ? [] : [setMaximumBuckets]),
        ];

        const executeViewerFunctions = [
          ...(setupState.policies.collector.installed ? [] : [createCollectorPackagePolicy]),
          ...(setupState.policies.symbolizer.installed ? [] : [createSymbolizerPackagePolicy]),
          ...(setupState.policies.apm.profilingEnabled
            ? [removeProfilingFromApmPackagePolicy]
            : []),
        ];

        if (!executeAdminFunctions.length && !executeViewerFunctions.length) {
          return response.ok();
        }

        const setupParams = {
          ...commonParams,
          config: dependencies.config,
        };
        await Promise.all(executeAdminFunctions.map((fn) => fn(setupParams)));
        await Promise.all(executeViewerFunctions.map((fn) => fn(setupParams)));

        if (dependencies.telemetryUsageCounter) {
          dependencies.telemetryUsageCounter.incrementCounter({
            counterName: `POST ${paths.HasSetupESResources}`,
            counterType: 'success',
          });
        }

        // We return a status code of 202 instead of 200 because enabling
        // resource management in Elasticsearch is an asynchronous action
        // and is not guaranteed to complete before Kibana sends a response.
        return response.accepted();
      } catch (error) {
        if (dependencies.telemetryUsageCounter) {
          dependencies.telemetryUsageCounter.incrementCounter({
            counterName: `POST ${paths.HasSetupESResources}`,
            counterType: 'error',
          });
        }
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while setting up Universal Profiling',
        });
      }
    }
  );
  // Show users the instructions on how to set up Universal Profiling agents
  router.get(
    {
      path: paths.SetupDataCollectionInstructions,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const apmServerHost = dependencies.setup.cloud?.apm?.url;
        const stackVersion = dependencies.stackVersion;
        const setupInstructions = await getSetupInstructions({
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: (await context.core).savedObjects.client,
          apmServerHost,
          stackVersion,
        });

        return response.ok({ body: setupInstructions });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching Universal Profiling instructions',
        });
      }
    }
  );
}
