/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { eachSeries } from 'async';
import { Logger } from '@kbn/logging';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { getSetupInstructions } from '../lib/setup/get_setup_instructions';
import { getProfilingSetupSteps } from '../lib/setup/steps';
import { createStepToInitializeElasticsearch } from '../lib/setup/steps/initialize_elasticsearch';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { hasProfilingData } from '../lib/setup/has_profiling_data';
import { getClient } from './compat';
import { ProfilingSetupStep } from '../lib/setup/types';

async function checkStep({ step, logger }: { step: ProfilingSetupStep; logger: Logger }) {
  try {
    return { name: step.name, completed: await step.hasCompleted(), error: null };
  } catch (error) {
    logger.error(error);
    return { name: step.name, completed: false, error: error.toString() };
  }
}

function checkSteps({ steps, logger }: { steps: ProfilingSetupStep[]; logger: Logger }) {
  return Promise.all(steps.map(async (step) => checkStep({ step, logger })));
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
        const stepOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        };

        logger.info('Checking if Elasticsearch and Fleet are setup for Universal Profiling');

        if (!dependencies.setup.cloud.isCloudEnabled) {
          throw new Error(`Universal Profiling is only available on Elastic Cloud.`);
        }

        const initializeStep = createStepToInitializeElasticsearch(stepOptions);
        const initializeResults = await checkStep({ step: initializeStep, logger });

        if (initializeResults.error) {
          return handleRouteHandlerError({ error: initializeResults.error, logger, response });
        }

        const hasData = await hasProfilingData({
          client: createProfilingEsClient({
            esClient,
            request,
          }),
        });

        if (hasData) {
          return response.ok({
            body: {
              has_data: true,
              has_setup: true,
              steps: [],
            },
          });
        }

        const stepCompletionResults = await checkSteps({
          steps: getProfilingSetupSteps(stepOptions),
          logger,
        });

        return response.ok({
          body: {
            has_setup: stepCompletionResults.every((step) => step.completed),
            has_data: false,
            steps: stepCompletionResults,
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
        const stepOptions = {
          client: clientWithDefaultAuth,
          logger,
          packagePolicyClient: dependencies.start.fleet.packagePolicyService,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces.spacesService.getSpaceId(request),
          isCloudEnabled: dependencies.setup.cloud.isCloudEnabled,
        };

        logger.info('Setting up Elasticsearch and Fleet for Universal Profiling');

        if (!dependencies.setup.cloud.isCloudEnabled) {
          throw new Error(`Universal Profiling is only available on Elastic Cloud.`);
        }

        const initializeStep = createStepToInitializeElasticsearch(stepOptions);
        const initializeResults = await checkStep({ step: initializeStep, logger });

        if (initializeResults.error) {
          return handleRouteHandlerError({ error: initializeResults.error, logger, response });
        }

        const steps = getProfilingSetupSteps(stepOptions);

        await eachSeries(steps, (step, cb) => {
          logger.debug(`Executing step ${step.name}`);
          step
            .init()
            .then(() => cb())
            .catch(cb);
        });

        const checkedSteps = await checkSteps({ steps, logger });

        if (checkedSteps.every((step) => step.completed)) {
          return response.ok();
        }

        return response.custom({
          statusCode: 500,
          body: {
            message: `Failed to complete all steps`,
            steps: checkedSteps,
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
