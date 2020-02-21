/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { extractEntityID, extractParentEntityID } from './utils/normalize';
import { getPaginationParams, buildPaginationCursor } from './utils/pagination';
import { Tree } from './utils/tree';
import { LifecycleQuery } from './queries/lifecycle';
import { ChildrenQuery } from './queries/children';
import { RelatedEventsQuery } from './queries/related_events';

// recursively get ancestry lifecycles for the given process
export async function getAncestors(
  client: IScopedClusterClient,
  levels: number,
  id: string,
  legacyEndpointID?: string
): Promise<[any[], string | null]> {
  if (levels === 0) {
    return [[], id];
  }

  const lifecycleQuery = new LifecycleQuery(legacyEndpointID);
  const { results: lifecycle } = await lifecycleQuery.search(client, id);

  if (lifecycle.length === 0) {
    return [[], null];
  }

  const [ancestors, next] = await getAncestors(
    client,
    levels - 1,
    extractParentEntityID(lifecycle[0]),
    legacyEndpointID
  );

  return [[{ lifecycle }].concat(ancestors), next];
}

// get paged related events
export async function getRelated(
  client: IScopedClusterClient,
  id: string,
  limit: number,
  legacyEndpointID?: string,
  after?: string
) {
  const pagination = getPaginationParams(limit, after);
  // Retrieve the related non-process events for a given process
  const relatedEventsQuery = new RelatedEventsQuery(legacyEndpointID, pagination);
  const relatedEvents = await relatedEventsQuery.search(client, id);

  const { totals, results: events } = relatedEvents;
  const total = totals[id] || 0;
  const next = buildPaginationCursor(total, events) || null;
  return [total, events, next];
}

// recursively get n children levels from the process
export async function getChildren({
  client,
  tree,
  ids,
  limit,
  levels,
  legacyEndpointID,
  after,
}: {
  client: IScopedClusterClient;
  tree: Tree;
  ids: string[];
  limit: number;
  levels: number;
  legacyEndpointID?: string;
  after?: string;
}): Promise<undefined> {
  const lastLevel = 0 === levels;
  const childLimit = getPaginationParams(limit, after);
  if (levels === 0 || !ids || ids.length === 0) {
    return;
  }
  const childrenQuery = new ChildrenQuery(legacyEndpointID, childLimit);
  const lifecycleQuery = new LifecycleQuery(legacyEndpointID);

  const { totals, results: events } = await childrenQuery.search(client, ...ids);
  if (events.length === 0) {
    return;
  }

  tree.addPagination(totals, events);
  const childIDs = events.map(extractEntityID);
  const { results: lifecycleEvents } = await lifecycleQuery.search(client, ...childIDs);
  lifecycleEvents.forEach(event => {
    tree.addChild(event, lastLevel);
  });

  await getChildren({
    client,
    tree,
    ids: childIDs,
    limit: limit * limit,
    levels: levels - 1,
    legacyEndpointID,
  });
}
