/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createInvestigateAppServerRoute } from '../create_investigate_app_server_route';
import { chunkOnTokenCount } from './chunk_on_token_count';

const chunkOnTokenCountRoute = createInvestigateAppServerRoute({
  endpoint: 'POST /internal/investigate_app/assistant/chunk_on_token_count',
  options: {
    tags: [],
  },
  params: t.type({
    body: t.type({
      maxTokenCount: t.number,
      parts: t.array(t.string),
      context: t.string,
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    chunks: string[][];
  }> => {
    const { maxTokenCount, parts, context } = resources.params.body;

    return {
      chunks: chunkOnTokenCount({
        maxTokenCount,
        parts,
        context,
      }),
    };
  },
});

export const assistantRoutes = {
  ...chunkOnTokenCountRoute,
};
