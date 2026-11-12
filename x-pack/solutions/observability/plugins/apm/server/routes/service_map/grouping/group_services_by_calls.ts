/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceGroupingStrategy, ServiceMapGroup } from '@kbn/apm-types';
import { NOT_CONNECTED_GROUP_ID, SHARED_GROUP_ID } from './constants';
import { findNotConnected } from './find_not_connected';
import { findSharedServices } from './find_shared_services';
import { inferGroupsFromCalls } from './infer_groups_from_calls';
import type { ServiceCallStats, WeightedEdge } from './types';
import { compareNames, edgesBetween } from './utils';

/**
 * A group for every service, from the calls between them: shared services first, then the ones
 * not connected to the rest, then groups inferred from the calls of the others, each named after
 * its busiest service.
 *
 * `assignment[i]` is the index in `groups` of `services[i]`, so the caller owns the order of
 * `services`, shared by every grouping strategy. `edges` and `stats` must come from
 * `getCallGraphEdges` for these same services. Whether the grouping reads well, `passes`, is for
 * the caller to add.
 */
export function groupServicesByCalls({
  services,
  edges,
  stats,
}: {
  services: readonly string[];
  edges: readonly WeightedEdge[];
  stats: ReadonlyMap<string, ServiceCallStats>;
}): Omit<ServiceGroupingStrategy, 'passes'> {
  const shared = findSharedServices({ stats });
  const rest = services.filter((service) => !shared.has(service));
  const restEdges = edgesBetween({ edges, services: new Set(rest) });

  const notConnected = findNotConnected({ services: rest, edges: restEdges });
  const connected = rest.filter((service) => !notConnected.has(service));
  const inferred = inferGroupsFromCalls({
    services: connected,
    edges: edgesBetween({ edges: restEdges, services: new Set(connected) }),
  });
  const busiest = busiestServiceByGroup({ groups: inferred, stats });

  const groupByService = new Map<string, ServiceMapGroup>();
  shared.forEach((service) => groupByService.set(service, { id: SHARED_GROUP_ID, kind: 'shared' }));
  notConnected.forEach((service) =>
    groupByService.set(service, { id: NOT_CONNECTED_GROUP_ID, kind: 'notConnected' })
  );
  for (const [service, group] of inferred) {
    const busiestService = busiest.get(group) ?? service;
    groupByService.set(service, { id: `calls:${busiestService}`, kind: 'calls', busiestService });
  }

  // groups in the order their first service appears
  const groups: ServiceMapGroup[] = [];
  const indexById = new Map<string, number>();
  const assignment = services.map((service) => {
    const group = groupByService.get(service);
    if (!group) {
      // shared, not connected and inferred together cover every service
      throw new Error(`${service} has no group, which shouldn't happen`);
    }
    const known = indexById.get(group.id);
    if (known !== undefined) {
      return known;
    }
    indexById.set(group.id, groups.length);
    groups.push(group);
    return groups.length - 1;
  });

  return { source: 'calls', groups, assignment };
}

/** The service with the most calls made and received in each group, ties broken by name. */
function busiestServiceByGroup({
  groups,
  stats,
}: {
  groups: ReadonlyMap<string, number>;
  stats: ReadonlyMap<string, ServiceCallStats>;
}): Map<number, string> {
  const busiest = new Map<number, string>();
  for (const [service, group] of groups) {
    const current = busiest.get(group);
    if (current === undefined) {
      busiest.set(group, service);
      continue;
    }
    const traffic = stats.get(service)?.traffic ?? 0;
    const currentTraffic = stats.get(current)?.traffic ?? 0;
    if (
      traffic > currentTraffic ||
      (traffic === currentTraffic && compareNames(service, current) < 0)
    ) {
      busiest.set(group, service);
    }
  }
  return busiest;
}
