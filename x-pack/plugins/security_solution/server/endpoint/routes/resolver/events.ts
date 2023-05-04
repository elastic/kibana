/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';
import type { RuleRegistryPluginStartContract } from '@kbn/rule-registry-plugin/server';
import type { ResolverPaginatedEvents, SafeResolverEvent } from '../../../../common/endpoint/types';
import type { validateEvents } from '../../../../common/endpoint/schema/resolver';
import { EventsQuery } from './queries/events';
import { PaginationBuilder } from './utils/pagination';

/**
 * Creates an object that the events handler would return
 *
 * @param events array of events
 * @param nextEvent the cursor to retrieve the next event
 */
function createEvents(
  events: SafeResolverEvent[] = [],
  nextEvent: string | null = null
): ResolverPaginatedEvents {
  return { events, nextEvent };
}

/**
 * This function handles the `/events` api and returns an array of events and a cursor if more events exist than were
 * requested.
 */
export function handleEvents(
  ruleRegistry: RuleRegistryPluginStartContract
): RequestHandler<
  unknown,
  TypeOf<typeof validateEvents.query>,
  TypeOf<typeof validateEvents.body>
> {
  return async (context, req, res) => {
    const {
      query: { limit, afterEvent },
      body,
    } = req;
    const eventsClient = (await context.core).elasticsearch.client;
    const alertsClient = await ruleRegistry.getRacClientWithRequest(req);

    const eventsQuery = new EventsQuery({
      pagination: PaginationBuilder.createBuilder(limit, afterEvent),
      indexPatterns: body.indexPatterns,
      timeRange: body.timeRange,
    });
    const results = await eventsQuery.search(eventsClient, body, alertsClient);
    return res.ok({
      body: createEvents(results, PaginationBuilder.buildCursorRequestLimit(limit, results)),
    });
  };
}
