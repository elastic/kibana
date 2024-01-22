/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupOptions } from '@kbn/profiling-data-access-plugin/common/setup';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { RouteRegisterParameters } from '..';
import { getRoutePaths } from '../../../common';
import { getHasSetupPrivileges } from '../../lib/setup/get_has_setup_privileges';
import { handleRouteHandlerError } from '../../utils/handle_route_error_handler';
import { getClient } from '../compat';
import { getCloudSetupInstructions } from './get_cloud_setup_instructions';
import { getSelfManagedInstructions } from './get_self_managed_instructions';
import { setupCloud } from './setup_cloud';
import { setupSelfManaged } from './setup_self_managed';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.HasSetupESResources,
      options: { tags: ['access:profiling'] },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const hasRequiredRole = dependencies.start.security
          ? await getHasSetupPrivileges({
              securityPluginStart: dependencies.start.security,
              request,
            })
          : true;

        const core = await context.core;

        const profilingStatus = await dependencies.start.profilingDataAccess.services.getStatus({
          esClient: core.elasticsearch.client,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces?.spacesService?.getSpaceId(request),
        });

        return response.ok({ body: { ...profilingStatus, has_required_role: hasRequiredRole } });
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
        const clientWithProfilingAuth = createProfilingEsClient({
          esClient,
          request,
          useDefaultAuth: false,
        });

        const commonSetupParams: ProfilingSetupOptions = {
          client: clientWithDefaultAuth,
          clientWithProfilingAuth,
          logger,
          soClient: core.savedObjects.client,
          spaceId:
            dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
        };

        const scopedESClient = (await context.core).elasticsearch.client;
        const { type, setupState } =
          await dependencies.start.profilingDataAccess.services.getSetupState({
            esClient: scopedESClient,
            soClient: core.savedObjects.client,
            spaceId:
              dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
          });

        const isCloudEnabled = dependencies.setup.cloud?.isCloudEnabled;
        if (isCloudEnabled && type === 'cloud') {
          if (!dependencies.start.fleet) {
            const msg = `Elastic Fleet is required to set up Universal Profiling on Cloud`;
            logger.error(msg);
            return response.custom({
              statusCode: 500,
              body: { message: msg },
            });
          }
          logger.debug('Setting up Universal Profiling on Cloud');

          await setupCloud({
            setupState,
            setupParams: {
              ...commonSetupParams,
              packagePolicyClient: dependencies.start.fleet.packagePolicyService,
              isCloudEnabled,
              config: dependencies.config,
            },
          });

          logger.debug('[DONE] Setting up Universal Profiling on Cloud');
        } else {
          logger.debug('Setting up self-managed Universal Profiling');

          await setupSelfManaged({
            setupState,
            setupParams: commonSetupParams,
          });

          logger.debug('[DONE] Setting up self-managed Universal Profiling');
        }

        // Wait until Profiling ES plugin creates all resources
        await clientWithDefaultAuth.profilingStatus({ waitForResourcesCreated: true });

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
        const stackVersion = dependencies.stackVersion;
        const isCloudEnabled = dependencies.setup.cloud?.isCloudEnabled;
        if (isCloudEnabled) {
          if (!dependencies.start.fleet) {
            const msg = `Elastic Fleet is required to set up Universal Profiling on Cloud`;
            logger.error(msg);
            return response.custom({
              statusCode: 500,
              body: { message: msg },
            });
          }

          const apmServerHost = dependencies.setup.cloud?.apm?.url;
          const setupInstructions = await getCloudSetupInstructions({
            packagePolicyClient: dependencies.start.fleet?.packagePolicyService,
            soClient: (await context.core).savedObjects.client,
            apmServerHost,
            stackVersion,
          });

          return response.ok({ body: setupInstructions });
        }

        return response.ok({ body: getSelfManagedInstructions({ stackVersion }) });
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
