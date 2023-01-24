/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { packagePolicyService } from '@kbn/fleet-plugin/server/services';
import { eachSeries } from 'async';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { getProfilingSetupSteps } from '../lib/setup/steps';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { hasProfilingData } from '../utils/init/preconditions';
import { getClient } from './compat';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  // Check if ES resources needed for Universal Profiling to work exist
  router.get(
    {
      path: paths.HasSetupESResources,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        logger.debug('checking if profiling ES configurations are installed');
        const core = await context.core;

        const steps = getProfilingSetupSteps({
          client: createProfilingEsClient({ esClient, request, useDefaultAuth: true }),
          logger,
          packagePolicyClient: packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        });

        const stepCompletionResults = await Promise.all(
          steps.map(async (step) => ({ name: step.name, completed: await step.hasCompleted() }))
        );

        // Reply to clients if we have already created all 12 events template indices.
        // This is kind of simplistic but can be a good first step to ensure
        // Profiling resources will be created.
        return response.ok({
          body: {
            has_setup: stepCompletionResults.every((step) => step.completed),
            steps: stepCompletionResults,
          },
        });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
  // Configure ES resources needed by Universal Profiling using the mappings
  router.post(
    {
      path: paths.HasSetupESResources,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        logger.info('Applying initial setup of Elasticsearch resources');
        const steps = getProfilingSetupSteps({
          client: createProfilingEsClient({ esClient, request, useDefaultAuth: true }),
          logger,
          packagePolicyClient: packagePolicyService,
          soClient: (await context.core).savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        });

        await eachSeries(steps, (step, cb) => {
          logger.debug(`Executing step ${step.name}`);
          step
            .init()
            .then(() => cb())
            .catch(cb);
        });

        return response.ok();
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
  // Detect if data collection is already in place
  router.get(
    {
      path: paths.HasSetupDataCollection,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        logger.info('checking if profiling data is already ingested');
        const hasData = await hasProfilingData(esClient);
        return response.ok({ body: { has_data: hasData } });
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
      return handleRouteHandlerError({
        error: {
          statusCode: 418,
          message: 'not yet implemented',
        },
        logger,
        response,
      });
    }
  );
}
