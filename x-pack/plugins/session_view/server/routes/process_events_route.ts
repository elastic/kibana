/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'kibana/server';
import { IRouter } from '../../../../../src/core/server';
import {
  PROCESS_EVENTS_ROUTE,
  PROCESS_EVENTS_PER_PAGE,
  PROCESS_EVENTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
} from '../../common/constants';

export const registerProcessEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: PROCESS_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
          cursor: schema.maybe(schema.string()),
          forward: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { sessionEntityId, cursor, forward = true } = request.query;
      const body = await doSearch(client, sessionEntityId, cursor, forward);

      return response.ok({ body });
    }
  );
};

export const doSearch = async (
  client: ElasticsearchClient,
  sessionEntityId: string,
  cursor: string | undefined,
  forward = true
) => {
  const search = await client.search({
    index: [PROCESS_EVENTS_INDEX],
    body: {
      query: {
        match: {
          [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
        },
      },
      size: PROCESS_EVENTS_PER_PAGE,
      sort: [{ '@timestamp': forward ? 'asc' : 'desc' }],
      search_after: cursor ? [cursor] : undefined,
    },
  });

  const events = search.hits.hits;

  if (!forward) {
    events.reverse();
  }

  const total =
    typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

  return {
    total,
    events,
  };
};
