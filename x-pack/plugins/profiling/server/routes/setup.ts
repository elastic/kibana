/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteRegisterParameters } from '.';
import { getClient } from './compat';
import { installLatestApmPackage, isApmPackageInstalled } from '../lib/setup/apm_package';
import { setMaximumBuckets, validateMaximumBuckets } from '../lib/setup/cluster_settings';
import {
  createCollectorPackagePolicy,
  createSymbolizerPackagePolicy,
  updateApmPolicy,
  validateApmPolicy,
} from '../lib/setup/fleet_policies';
import { getSetupInstructions } from '../lib/setup/get_setup_instructions';
import { hasProfilingData } from '../lib/setup/has_profiling_data';
import { setSecurityRole, validateSecurityRole } from '../lib/setup/security_role';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getRoutePaths } from '../../common';

export interface SetupResourceResponse {
  cloud: {
    available: boolean;
    required: boolean;
  };
  data: {
    available: boolean;
  };
  packages: {
    installed: boolean;
  };
  permissions: {
    configured: boolean;
  };
  policies: {
    installed: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
  };
  settings: {
    configured: boolean;
  };
}

function createDefaultSetupResourceResponse(): SetupResourceResponse {
  return {
    cloud: {
      available: false,
      required: true,
    },
    data: {
      available: false,
    },
    packages: {
      installed: false,
    },
    permissions: {
      configured: false,
    },
    policies: {
      installed: false,
    },
    resource_management: {
      enabled: false,
    },
    resources: {
      created: false,
    },
    settings: {
      configured: false,
    },
  };
}

function everySetupResourceResponse(response: SetupResourceResponse): boolean {
  return (
    response.packages.installed &&
    response.permissions.configured &&
    response.policies.installed &&
    response.settings.configured
  );
}

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

        const body = createDefaultSetupResourceResponse();
        body.cloud.available = dependencies.setup.cloud.isCloudEnabled;

        if (!body.cloud.available) {
          return response.ok({
            body: {
              has_data: false,
              has_setup: false,
            },
          });
        }

        const statusResponse = await clientWithDefaultAuth.profilingStatus();
        body.resource_management.enabled = statusResponse.resource_management.enabled;
        body.resources.created = statusResponse.resources.created;

        if (!body.resources.created) {
          return response.ok({
            body: {
              has_data: false,
              has_setup: false,
            },
          });
        }

        body.data.available = await hasProfilingData({
          client: createProfilingEsClient({
            esClient,
            request,
          }),
        });

        if (body.data.available) {
          return response.ok({
            body: {
              has_data: true,
              has_setup: true,
            },
          });
        }

        const verifyFunctions = [
          async () => {
            body.packages.installed = await isApmPackageInstalled(setupOptions);
          },
          async () => {
            body.policies.installed = await validateApmPolicy(setupOptions);
          },
          async () => {
            body.settings.configured = await validateMaximumBuckets(setupOptions);
          },
          async () => {
            body.permissions.configured = await validateSecurityRole(setupOptions);
          },
        ];
        await Promise.all(verifyFunctions.map(async (fn) => await fn()));

        return response.ok({
          body: {
            has_setup: everySetupResourceResponse(body),
            has_data: false,
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

        const body = createDefaultSetupResourceResponse();
        body.cloud.available = dependencies.setup.cloud.isCloudEnabled;

        if (!body.cloud.available) {
          return response.ok({
            body: {
              has_data: false,
              has_setup: false,
            },
          });
        }

        const statusResponse = await clientWithDefaultAuth.profilingStatus();
        body.resource_management.enabled = statusResponse.resource_management.enabled;
        body.resources.created = statusResponse.resources.created;

        if (!body.resources.created) {
          return response.ok({
            body: {
              has_data: false,
              has_setup: false,
            },
          });
        }

        body.data.available = await hasProfilingData({
          client: createProfilingEsClient({
            esClient,
            request,
          }),
        });

        if (body.data.available) {
          return response.ok({
            body: {
              has_data: true,
              has_setup: true,
            },
          });
        }

        const executeFunctions = [
          installLatestApmPackage,
          updateApmPolicy,
          createCollectorPackagePolicy,
          createSymbolizerPackagePolicy,
          setSecurityRole,
          setMaximumBuckets,
        ];
        await Promise.all(executeFunctions.map(async (fn) => await fn(setupOptions)));

        const verifyFunctions = [
          async () => {
            body.packages.installed = await isApmPackageInstalled(setupOptions);
          },
          async () => {
            body.policies.installed = await validateApmPolicy(setupOptions);
          },
          async () => {
            body.settings.configured = await validateMaximumBuckets(setupOptions);
          },
          async () => {
            body.permissions.configured = await validateSecurityRole(setupOptions);
          },
        ];
        await Promise.all(verifyFunctions.map(async (fn) => await fn()));

        if (everySetupResourceResponse(body)) {
          return response.ok();
        }

        return response.custom({
          statusCode: 500,
          body: {
            message: `Failed to complete all steps`,
          },
        });
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
