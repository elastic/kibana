/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, Logger } from 'kibana/server';
import { IRouter } from '../../../../../src/core/server';
import { PROCESS_EVENTS_ROUTE, PROCESS_EVENTS_PER_PAGE } from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';

export const registerProcessEventsRoute = (router: IRouter, logger: Logger) => {
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
  // Temporary hack. Updates .siem-signals-default index to include a mapping for process.entry.entity_id
  // TODO: find out how to do proper index mapping migrations...
  let siemSignalsExists = true;

  try {
    await client.indices.putMapping({
      index: '.siem-signals-default',
      body: {
        properties: {
          'process.entry.entity_id': {
            type: 'keyword',
          },
        },
      },
    });
  } catch (err) {
    siemSignalsExists = false;
  }

  const indices = ['cmd'];

  if (siemSignalsExists) {
    indices.push('.siem-signals-default');
  }

  const search = await client.search({
    index: indices,
    body: {
      query: {
        match: {
          'process.entry.entity_id': sessionEntityId,
        },
      },
      size: PROCESS_EVENTS_PER_PAGE,
      sort: [{ '@timestamp': forward ? 'asc' : 'desc' }],
      search_after: cursor ? [cursor] : undefined,
    },
  });

  const events = search.body.hits.hits.map((hit: any) => {
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
