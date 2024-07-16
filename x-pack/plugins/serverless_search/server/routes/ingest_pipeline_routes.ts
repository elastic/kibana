/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../plugin';

export const registerIngestPipelineRoutes = ({ router }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/serverless_search/ingest_pipelines',
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const pipelines = await client.asCurrentUser.ingest.getPipeline();

      return response.ok({
        body: {
          pipelines,
        },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
};
