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
  ALERTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
} from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

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
    // TODO: move alerts into it's own route with it's own pagination.
    index: [PROCESS_EVENTS_INDEX, ALERTS_INDEX],
    ignore_unavailable: true,
    body: {
      query: {
        match: {
          [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId,
        },
      },
      // This runtime_mappings is a temporary fix, so we are able to Query these ECS fields while they are not available
      // TODO: Remove the runtime_mappings once process.entry_leader.entity_id is implemented to ECS
      runtime_mappings: {
        [ENTRY_SESSION_ENTITY_ID_PROPERTY]: {
          type: 'keyword',
        },
      },
      size: PROCESS_EVENTS_PER_PAGE,
      sort: [{ '@timestamp': forward ? 'asc' : 'desc' }],
      search_after: cursor ? [cursor] : undefined,
    },
  });

  const events = search.hits.hits.map((hit: any) => {
    // TODO: re-eval if this is needed after moving alerts to it's own route.
    // the .siem-signals-default index flattens many properties. this util unflattens them.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  if (!forward) {
    events.reverse();
  }

  return {
    events,
  };
};
