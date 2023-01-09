/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { clearExecutableCache, clearStackFrameCache } from './stacktrace';

export function registerCacheExecutablesRoute({ router, logger }: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.delete(
    {
      path: paths.CacheExecutables,
      validate: {},
    },
    async (context, request, response) => {
      try {
        logger.info(`clearing executable cache`);
        const numDeleted = clearExecutableCache();
        logger.info(`removed ${numDeleted} executables from cache`);

        return response.ok({});
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}

export function registerCacheStackFramesRoute({ router, logger }: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.delete(
    {
      path: paths.CacheStackFrames,
      validate: {},
    },
    async (context, request, response) => {
      try {
        logger.info(`clearing stackframe cache`);
        const numDeleted = clearStackFrameCache();
        logger.info(`removed ${numDeleted} stackframes from cache`);

        return response.ok({});
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}
