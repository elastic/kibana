/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FilesRouter } from './types';

import { FilesMetricsHttpEndpoint, FILES_API_ROUTES } from './api_routes';
import type { FilesRequestHandler } from './types';

const method = 'get' as const;

type Response = FilesMetricsHttpEndpoint['output'];

const handler: FilesRequestHandler = async ({ files }, req, res) => {
  const { fileService } = await files;
  const body: Response = await fileService.asCurrentUser().getUsageMetrics();
  return res.ok({
    body,
  });
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.metrics,
      validate: {},
    },
    handler
  );
}
