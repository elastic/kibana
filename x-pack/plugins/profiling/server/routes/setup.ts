/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySetup } from '../utils/mappings/mapping';
import { getClient } from './compat';
import { getRoutePaths } from '../../common';
import { RouteRegisterParameters } from '.';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';

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
  // Configure ES resources needed by Universal Profiling using the mappings
  router.post(
    {
      path: paths.HasSetupESResources,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const esClient = await getClient(context);
        logger.info('applying initial setup of Elasticsearch resources');

        return await applySetup(esClient).then((_) => {
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
