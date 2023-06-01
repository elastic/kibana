/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteRegisterParameters } from '.';
import { getClient } from './compat';
import { installLatestApmPackage, isApmPackageInstalled } from '../lib/setup/apm_package';
import {
  enableResourceManagement,
  setMaximumBuckets,
  validateMaximumBuckets,
} from '../lib/setup/cluster_settings';
import {
  createCollectorPackagePolicy,
  createSymbolizerPackagePolicy,
  updateApmPolicy,
  validateApmPolicy,
  validateCollectorPackagePolicy,
  validateSymbolizerPackagePolicy,
} from '../lib/setup/fleet_policies';
import { getSetupInstructions } from '../lib/setup/get_setup_instructions';
import { hasProfilingData } from '../lib/setup/has_profiling_data';
import { setSecurityRole, validateSecurityRole } from '../lib/setup/security_role';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getRoutePaths } from '../../common';
import { areResourcesSetup, createDefaultSetupState } from '../../common/setup';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  // Check if Elasticsearch and Fleet are setup for Universal Profiling
  router.get(
    {
      path: paths.HasSetupESResources,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        const core = await context.core;
        const client = createProfilingEsClient({
          esClient,
          request,
        });
        const clientWithDefaultAuth = createProfilingEsClient({
          esClient,
          request,
          useDefaultAuth: true,
        });
        const setupOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        };

        logger.info('Checking if Elasticsearch and Fleet are setup for Universal Profiling');

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

        const verifyFunctions = [
          async () => {
            const statusResponse = await clientWithDefaultAuth.profilingStatus();
            state.resource_management.enabled = statusResponse.resource_management.enabled;
            state.resources.created = statusResponse.resources.created;
          },
          async () => {
            state.data.available = await hasProfilingData({ client });
          },
          async () => {
            state.packages.installed = await isApmPackageInstalled(setupOptions);
          },
          async () => {
            state.policies.apm.installed = await validateApmPolicy(setupOptions);
          },
          async () => {
            state.policies.collector.installed = await validateCollectorPackagePolicy(setupOptions);
          },
          async () => {
            state.policies.symbolizer.installed = await validateSymbolizerPackagePolicy(
              setupOptions
            );
          },
          async () => {
            state.settings.configured = await validateMaximumBuckets(setupOptions);
          },
          async () => {
            state.permissions.configured = await validateSecurityRole(setupOptions);
          },
        ];
        await Promise.all(verifyFunctions.map(async (fn) => await fn()));

        return response.ok({
          body: {
            has_setup: areResourcesSetup(state),
            has_data: state.data.available,
          },
        });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
  // Set up Elasticsearch and Fleet for Universal Profiling
  router.post(
    {
      path: paths.HasSetupESResources,
      validate: {},
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
        const setupOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        };

        logger.info('Setting up Elasticsearch and Fleet for Universal Profiling');

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

        const verifyFunctions = [
          async () => {
            const statusResponse = await clientWithDefaultAuth.profilingStatus();
            state.resource_management.enabled = statusResponse.resource_management.enabled;
            state.resources.created = statusResponse.resources.created;
          },
          async () => {
            state.packages.installed = await isApmPackageInstalled(setupOptions);
          },
          async () => {
            state.policies.apm.installed = await validateApmPolicy(setupOptions);
          },
          async () => {
            state.policies.collector.installed = await validateCollectorPackagePolicy(setupOptions);
          },
          async () => {
            state.policies.symbolizer.installed = await validateSymbolizerPackagePolicy(
              setupOptions
            );
          },
          async () => {
            state.settings.configured = await validateMaximumBuckets(setupOptions);
          },
          async () => {
            state.permissions.configured = await validateSecurityRole(setupOptions);
          },
        ];
        await Promise.all(verifyFunctions.map(async (fn) => await fn()));

        if (areResourcesSetup(state)) {
          return response.ok();
        }

        const executeFunctions = [
          installLatestApmPackage,
          updateApmPolicy,
          createCollectorPackagePolicy,
          createSymbolizerPackagePolicy,
          enableResourceManagement,
          setSecurityRole,
          setMaximumBuckets,
        ];
        await Promise.all(executeFunctions.map(async (fn) => await fn(setupOptions)));

        return response.accepted();
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
  // Show users the instructions on how to setup Universal Profiling agents
  router.get(
    {
      path: paths.SetupDataCollectionInstructions,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const setupInstructions = await getSetupInstructions({
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: (await context.core).savedObjects.client,
        });

        return response.ok({ body: setupInstructions });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}
