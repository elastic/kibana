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
import { EventAction, EventKind, ProcessEvent } from '../../common/types/process_tree';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  PROCESS_EVENTS_INDEX,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  TTY_CHAR_DEVICE_MAJOR_PROPERTY,
  TTY_CHAR_DEVICE_MINOR_PROPERTY,
  HOST_BOOT_ID_PROPERTY,
  PROCESS_ENTITY_ID_PROPERTY,
  PROCESS_EVENTS_PER_PAGE,
} from '../../common/constants';

/**
 * Grabs the most recent event for the session and extracts the TTY char_device
 * major/minor numbers, boot id, and session date range to use in querying for tty IO events.
 * This is done so that any process from any session that writes to this TTY at the time of
 * this session will be shown in the TTY Player. e.g. wall
 */
export const getTTYQueryPredicates = async (
  client: ElasticsearchClient,
  sessionEntityId: string
) => {
  const lastEventQuery = await client.search({
    index: [PROCESS_EVENTS_INDEX],
    body: {
      query: {
        bool: {
          minimum_should_match: 1,
          should: [
            { term: { [EVENT_ACTION]: 'fork' } },
            { term: { [EVENT_ACTION]: 'exec' } },
            { term: { [EVENT_ACTION]: 'end' } },
          ],
          must: [{ term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } }],
        },
      },
      size: 1,
      sort: [{ [TIMESTAMP]: 'desc' }],
    },
  });

  const lastEventHits = lastEventQuery.hits.hits;

  if (lastEventHits.length > 0) {
    const lastEvent: ProcessEvent = lastEventHits[0]._source as ProcessEvent;
    const range = [lastEvent?.process?.entry_leader?.start, lastEvent[TIMESTAMP]];
    const tty = lastEvent?.process?.entry_leader?.tty;
    const bootId = lastEvent?.host?.boot?.id;

    if (tty?.char_device?.major !== undefined && tty?.char_device?.minor !== undefined && bootId) {
      return {
        ttyMajor: tty.char_device.major,
        ttyMinor: tty.char_device.minor,
        bootId,
        range,
      };
    }
  }

  return null;
};

export const registerIOEventsRoute = (router: IRouter) => {
  router.get(
    {
      path: IO_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          sessionEntityId: schema.string(),
          cursor: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const { cursor } = request.query;
      const { sessionEntityId } = request.query;

      try {
        const ttyPredicates = await getTTYQueryPredicates(client, sessionEntityId);

        if (!ttyPredicates) {
          return response.ok({ body: { total: 0, events: [] } });
        }

        const search = await client.search({
          index: [PROCESS_EVENTS_INDEX],
          body: {
            query: {
              bool: {
                must: [
                  { term: { [TTY_CHAR_DEVICE_MAJOR_PROPERTY]: ttyPredicates.ttyMajor } },
                  { term: { [TTY_CHAR_DEVICE_MINOR_PROPERTY]: ttyPredicates.ttyMinor } },
                  { term: { [HOST_BOOT_ID_PROPERTY]: ttyPredicates.bootId } },
                  { term: { [EVENT_ACTION]: 'text_output' } },
                  {
                    range: {
                      [TIMESTAMP]: {
                        gte: ttyPredicates.range[0],
                        lte: ttyPredicates.range[1],
                      },
                    },
                  },
                ],
              },
            },
            size: IO_EVENTS_PER_PAGE,
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
            '@timestamp': {
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
          },
          aggs: {
            bucket_sort: {
              bucket_sort: {
                size: PROCESS_EVENTS_PER_PAGE,
              },
            },
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
      },
      process: {
        entity_id: bucket.key,
      },
    },
  }));
};
