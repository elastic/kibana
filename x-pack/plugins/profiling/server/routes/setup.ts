/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import {
  areResourcesSetupForAdmin,
  areResourcesSetupForViewer,
  createDefaultSetupState,
  mergePartialSetupStates,
} from '../../common/setup';
import {
  enableResourceManagement,
  setMaximumBuckets,
  validateMaximumBuckets,
  validateResourceManagement,
} from '../lib/setup/cluster_settings';
import {
  createCollectorPackagePolicy,
  createSymbolizerPackagePolicy,
  removeProfilingFromApmPackagePolicy,
  validateCollectorPackagePolicy,
  validateProfilingInApmPackagePolicy,
  validateSymbolizerPackagePolicy,
} from '../lib/setup/fleet_policies';
import { getSetupInstructions } from '../lib/setup/get_setup_instructions';
import { hasProfilingData } from '../lib/setup/has_profiling_data';
import { setSecurityRole, validateSecurityRole } from '../lib/setup/security_role';
import { ProfilingSetupOptions } from '../lib/setup/types';
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

        const setupOptions: ProfilingSetupOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId:
            dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
          config: dependencies.config,
        };

        const state = createDefaultSetupState();
        state.cloud.available = dependencies.setup.cloud.isCloudEnabled;

        if (!state.cloud.available) {
          const msg = `Elastic Cloud is required to set up Elasticsearch and Fleet for Universal Profiling`;
          logger.error(msg);
          return response.custom({
            statusCode: 500,
            body: {
              message: msg,
            },
          });
        }

        const verifyFunctionsForViewer = [
          validateCollectorPackagePolicy,
          validateSymbolizerPackagePolicy,
          validateProfilingInApmPackagePolicy,
        ];

        const partialStatesForViewer = await Promise.all([
          ...verifyFunctionsForViewer.map((fn) => fn(setupOptions)),
          hasProfilingData({
            ...setupOptions,
            client: clientWithProfilingAuth,
          }),
        ]);

        const mergedStateForViewer = mergePartialSetupStates(state, partialStatesForViewer);

        /*
         * We need to split the verification steps
         * because of users with viewer privileges
         * cannot get the cluster settings
         */
        if (
          areResourcesSetupForViewer(mergedStateForViewer) &&
          mergedStateForViewer.data.available
        ) {
          return response.ok({
            body: {
              has_setup: true,
              has_data: mergedStateForViewer.data.available,
            },
          });
        }

        /**
         * Performe advanced verification in case the first step failed.
         */
        const verifyFunctionsForAdmin = [
          validateMaximumBuckets,
          validateResourceManagement,
          validateSecurityRole,
        ];

        const partialStatesForAdmin = await Promise.all(
          verifyFunctionsForAdmin.map((fn) => fn(setupOptions))
        );
        const mergedState = mergePartialSetupStates(mergedStateForViewer, partialStatesForAdmin);

        return response.ok({
          body: {
            has_setup: areResourcesSetupForAdmin(mergedState),
            has_data: mergedState.data.available,
          },
        });
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
        const esClient = await getClient(context);
        const core = await context.core;
        const clientWithDefaultAuth = createProfilingEsClient({
          esClient,
          request,
          useDefaultAuth: true,
        });
        const setupOptions: ProfilingSetupOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId:
            dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
          config: dependencies.config,
        };

        const state = createDefaultSetupState();
        state.cloud.available = dependencies.setup.cloud.isCloudEnabled;

        if (!state.cloud.available) {
          const msg = `Elastic Cloud is required to set up Elasticsearch and Fleet for Universal Profiling`;
          logger.error(msg);
          return response.custom({
            statusCode: 500,
            body: {
              message: msg,
            },
          });
        }

        const partialStates = await Promise.all(
          [
            validateCollectorPackagePolicy,
            validateMaximumBuckets,
            validateResourceManagement,
            validateSecurityRole,
            validateSymbolizerPackagePolicy,
            validateProfilingInApmPackagePolicy,
          ].map((fn) => fn(setupOptions))
        );
        const mergedState = mergePartialSetupStates(state, partialStates);

        const executeFunctions = [
          ...(mergedState.policies.collector.installed ? [] : [createCollectorPackagePolicy]),
          ...(mergedState.policies.symbolizer.installed ? [] : [createSymbolizerPackagePolicy]),
          ...(mergedState.policies.apm.profilingEnabled
            ? [removeProfilingFromApmPackagePolicy]
            : []),
          ...(mergedState.resource_management.enabled ? [] : [enableResourceManagement]),
          ...(mergedState.permissions.configured ? [] : [setSecurityRole]),
          ...(mergedState.settings.configured ? [] : [setMaximumBuckets]),
        ];

        if (!executeFunctions.length) {
          return response.ok();
        }

        await Promise.all(executeFunctions.map((fn) => fn(setupOptions)));

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
