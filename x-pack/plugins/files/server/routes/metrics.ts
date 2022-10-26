/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FILES_MANAGE_PRIVILEGE } from '../../common/constants';
import type { FilesRouter } from './types';

import { FilesMetrics } from '../../common';
import { CreateRouteDefinition, FILES_API_ROUTES } from './api_routes';
import type { FilesRequestHandler } from './types';

const method = 'get' as const;

export type Endpoint = CreateRouteDefinition<{}, FilesMetrics>;

const handler: FilesRequestHandler = async ({ files }, req, res) => {
  const { fileService } = await files;
  const body: Endpoint['output'] = await fileService.asCurrentUser().getUsageMetrics();
  return res.ok({
    body,
  });
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.metrics,
      validate: {},
      options: {
        tags: [`access:${FILES_MANAGE_PRIVILEGE}`],
      },
    },
    handler
  );
}
