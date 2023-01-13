/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { applySetup, configureFleetPolicy } from '../utils/mappings/setup';
import { getClient } from './compat';
import { getRoutePaths } from '../../common';
import { RouteRegisterParameters } from '.';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { hasProfilingData, hasProfilingSetupCompleted } from '../utils/init/preconditions';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
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
        logger.info('checking if profiling ES configurations are installed');

        const done = await hasProfilingSetupCompleted(esClient);

        // Reply to clients if we have already created all 12 events template indices.
        // This is kind of simplistic but can be a good first step to ensure
        // Profiling resources will be created.
        return response.ok({ body: { has_setup: done.length === 12 } });
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
        // FIXME
        // @dgieselaar: not sure how to get the client...
        const soClient = (await context.core).savedObjects.client;
        logger.info('applying initial setup of Elasticsearch resources');

        return await applySetup(esClient)
          .then((_) => configureFleetPolicy(esClient, soClient))
          .then((_) => {
            return response.ok();
          });
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
