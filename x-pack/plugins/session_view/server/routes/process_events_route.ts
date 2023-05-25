/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import _ from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IRouter } from '@kbn/core/server';
import type {
  AlertsClient,
  RuleRegistryPluginStartContract,
} from '@kbn/rule-registry-plugin/server';
import { EVENT_ACTION } from '@kbn/rule-data-utils';
import {
  ALERTS_PER_PROCESS_EVENTS_PAGE,
  PROCESS_EVENTS_ROUTE,
  PROCESS_EVENTS_PER_PAGE,
  ENTRY_SESSION_ENTITY_ID_PROPERTY,
  TIMESTAMP_PROPERTY,
} from '../../common/constants';
import { ProcessEvent } from '../../common/types/process_tree';
import { searchAlerts } from './alerts_route';
import { searchProcessWithIOEvents } from './io_events_route';

export const registerProcessEventsRoute = (
  router: IRouter,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  router.get(
    {
      path: PROCESS_EVENTS_ROUTE,
      validate: {
        query: schema.object({
          index: schema.string(),
          sessionEntityId: schema.string(),
          sessionStartTime: schema.string(),
          cursor: schema.maybe(schema.string()),
          forward: schema.maybe(schema.boolean()),
          pageSize: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
      const { index, sessionEntityId, sessionStartTime, cursor, forward, pageSize } = request.query;

      try {
        const body = await fetchEventsAndScopedAlerts(
          client,
          alertsClient,
          index,
          sessionEntityId,
          sessionStartTime,
          cursor,
          forward,
          pageSize
        );

        return response.ok({ body });
      } catch (err) {
        // unauthorized
        if (err.meta.statusCode === 403) {
          return response.ok({ body: { total: 0, events: [] } });
        }

        return response.badRequest(err.message);
      }
    }
  );
};

export const fetchEventsAndScopedAlerts = async (
  client: ElasticsearchClient,
  alertsClient: AlertsClient,
  index: string,
  sessionEntityId: string,
  sessionStartTime: string,
  cursor?: string,
  forward = true,
  pageSize = PROCESS_EVENTS_PER_PAGE
) => {
  const cursorMillis = cursor && new Date(cursor).getTime() + (forward ? -1 : 1);

  const search = await client.search({
    index: [index],
    body: {
      query: {
        bool: {
          must: [
            { term: { [ENTRY_SESSION_ENTITY_ID_PROPERTY]: sessionEntityId } },
            {
              bool: {
                should: [
                  { term: { [EVENT_ACTION]: 'fork' } },
                  { term: { [EVENT_ACTION]: 'exec' } },
                  { term: { [EVENT_ACTION]: 'end' } },
                ],
              },
            },
            {
              range: {
                // optimization to prevent data before this session from being hit.
                [TIMESTAMP_PROPERTY]: {
                  gte: sessionStartTime,
                },
              },
            },
          ],
        },
      },
      size: Math.min(pageSize, PROCESS_EVENTS_PER_PAGE),
      sort: [{ '@timestamp': forward ? 'asc' : 'desc' }],
      search_after: cursorMillis ? [cursorMillis] : undefined,
    },
  });

  let events = search.hits.hits;

  if (!forward) {
    events.reverse();
  }

  const total =
    typeof search.hits.total === 'number' ? search.hits.total : search.hits.total?.value;

  if (events.length > 0) {
    // go grab any alerts which happened in this page of events.
    const firstEvent = _.first(events)?._source as ProcessEvent;
    const lastEvent = _.last(events)?._source as ProcessEvent;

    let range;

    if (firstEvent?.['@timestamp'] && lastEvent?.['@timestamp']) {
      range = [firstEvent['@timestamp'], lastEvent['@timestamp']];
    }

    const alertsBody = await searchAlerts(
      alertsClient,
      sessionEntityId,
      ALERTS_PER_PROCESS_EVENTS_PAGE,
      undefined,
      range
    );

    const processesWithIOEvents = await searchProcessWithIOEvents(
      client,
      index,
      sessionEntityId,
      range
    );

    events = [...events, ...alertsBody.events, ...processesWithIOEvents];
  }

  return {
    total,
    events,
  };
};
