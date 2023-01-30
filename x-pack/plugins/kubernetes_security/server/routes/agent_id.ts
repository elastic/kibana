/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { PROCESS_EVENTS_INDEX } from '@kbn/session-view-plugin/common/constants';
import { AGENT_ID_ROUTE } from '../../common/constants';

export const registerAgentIdRoute = (router: IRouter) => {
  router.get(
    {
      path: AGENT_ID_ROUTE,
      validate: {
        query: schema.object({
          query: schema.string(),
          index: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { query, index } = request.query;
      try {
        const agentId = await getAgentId(client, query, index);
        return response.ok({ body: { agentId } });
      } catch (err) {
        return response.badRequest(err.message);
      }
    }
  );
};

export const getAgentId = async (client: ElasticsearchClient, query: string, index?: string) => {
  const queryDSL = JSON.parse(query);
  const search = await client.search({
    index: [index || PROCESS_EVENTS_INDEX],
    body: {
      query: queryDSL,
      size: 1,
    },
  });

  const agentId = (search.hits.hits as any)?.[0]?._source?.agent?.id ?? null;
  return agentId;
};
