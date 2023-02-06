/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { EVENT_ACTION, TIMESTAMP } from '@kbn/rule-data-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import { Aggregate } from '../../common/types/aggregate';
import { EventAction, EventKind } from '../../common/types/process_tree';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  PROCESS_EVENTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  PROCESS_ENTITY_ID_PROPERTY,
  PROCESS_EVENTS_PER_PAGE,
} from '../../common/constants';

export const registerIOEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: IO_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
          cursor: schema.maybe(schema.string()),
          pageSize: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { sessionEntityId, cursor, pageSize = IO_EVENTS_PER_PAGE } = request.query;

      try {
        const search = await client.search({
          index: [PROCESS_EVENTS_INDEX],
          body: {
            query: {
              bool: {
                must: [
                  { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
                  { term: { [EVENT_ACTION]: 'text_output' } },
                ],
              },
            },
            size: Math.min(pageSize, IO_EVENTS_PER_PAGE),
            sort: [{ [TIMESTAMP]: 'asc' }],
            search_after: cursor ? [cursor] : undefined,
          },
        });

        const events = search.hits.hits;
        const total =
          typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

        return response.ok({ body: { total, events } });
      } catch (err) {
        // unauthorized
        if (err?.meta?.statusCode === 403) {
          return response.ok({ body: { total: 0, events: [] } });
        }

        return response.badRequest(err.message);
      }
    }
  );
};

export const searchProcessWithIOEvents = async (
  client: ElasticsearchClient,
  sessionEntityId: string,
  range?: string[]
) => {
  const rangeFilter = range
    ? [
        {
          range: {
            [TIMESTAMP]: {
              gte: range[0],
              lte: range[1],
            },
          },
        },
      ]
    : [];

  const search = await client.search({
    index: [PROCESS_EVENTS_INDEX],
    body: {
      query: {
        bool: {
          must: [
            { term: { [EVENT_ACTION]: 'text_output' } },
            { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
            ...rangeFilter,
          ],
        },
      },
      size: 0,
      aggs: {
        custom_agg: {
          terms: {
            field: PROCESS_ENTITY_ID_PROPERTY,
            size: PROCESS_EVENTS_PER_PAGE,
          },
        },
      },
    },
  });

  const agg: any = search.aggregations?.custom_agg;
  const buckets: Aggregate[] = agg?.buckets || [];

  return buckets.map((bucket) => ({
    _source: {
      event: {
        kind: EventKind.event,
        action: EventAction.text_output,
        id: bucket.key,
      },
      process: {
        entity_id: bucket.key,
      },
    },
  }));
};
