/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
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
    available: boolean;
    configured: boolean;
    created: boolean;
    defined: boolean;
    ready: boolean;
  };
  settings: {
    configured: boolean;
  };
  errors: string[];
}

export function createDefaultSetupResourceResponse(): SetupResourceResponse {
  const response = {} as SetupResourceResponse;

  set(response, 'cloud.required', true);
  set(response, 'cloud.available', false);
  set(response, 'data.available', false);
  set(response, 'packages.installed', false);
  set(response, 'permissions.configured', false);
  set(response, 'policies.installed', false);
  set(response, 'resource_management.enabled', false);
  set(response, 'resources.available', false);
  set(response, 'resources.configured', false);
  set(response, 'resources.created', false);
  set(response, 'resources.defined', false);
  set(response, 'resources.ready', false);
  set(response, 'settings.configured', false);

  response.errors = [];

  return response;
}

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

async function executeStep({ step, logger }: { step: ProfilingSetupStep; logger: Logger }) {
  logger.debug(`Executing step ${step.name}`);
  step.init();
}

function executeSteps({ steps, logger }: { steps: ProfilingSetupStep[]; logger: Logger }) {
  return Promise.all(steps.map(async (step) => executeStep({ step, logger })));
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

        const body = createDefaultSetupResourceResponse();
        set(body, 'cloud.available', dependencies.setup.cloud.isCloudEnabled);

        if (!dependencies.setup.cloud.isCloudEnabled) {
          throw new Error(`Universal Profiling is only available on Elastic Cloud.`);
        }

        const initializeStep = createStepToInitializeElasticsearch(stepOptions);
        const initializeResult = await checkStep({ step: initializeStep, logger });

        if (!initializeResult.completed) {
          throw new Error(`Elasticsearch is not initialized for Universal Profiling`);
        }
        if (initializeResult.error) {
          return handleRouteHandlerError({ error: initializeResult.error, logger, response });
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
        await executeStep({ step: initializeStep, logger });
        const initializeResult = await checkStep({ step: initializeStep, logger });

        if (!initializeResult.completed) {
          throw new Error(`Elasticsearch is not initialized for Universal Profiling`);
        }
        if (initializeResult.error) {
          return handleRouteHandlerError({ error: initializeResult.error, logger, response });
        }

        const steps = getProfilingSetupSteps(stepOptions);
        await executeSteps({ steps, logger });
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
