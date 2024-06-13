/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { fetchInferenceEndpoints } from './lib/fetch_inference_endpoints';
import { APIRoutes } from './types';
import { errorHandler } from './utils/error_handler';

export function defineRoutes({ logger, router }: { logger: Logger; router: IRouter }) {
  router.get(
    {
      path: APIRoutes.GET_INFERENCE_ENDPOINTS,
      validate: {},
    },
    errorHandler(logger)(async (context, request, response) => {
      const {
        client: { asCurrentUser },
      } = (await context.core).elasticsearch;

      const { inferenceEndpoints } = await fetchInferenceEndpoints(asCurrentUser);

      return response.ok({
        body: {
          inference_endpoints: inferenceEndpoints,
        },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
