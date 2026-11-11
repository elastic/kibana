/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedServiceCallGraph } from './match_service_call_graph';
import { compareNames } from './utils';

/** Two services that call each other, in either direction, and how much. */
interface WeightedEdge {
  source: string;
  target: string;
  weight: number;
}

interface ServiceCallStats {
  /** Distinct services that call it. */
  callers: number;
  /** Distinct services it calls or that call it. */
  neighbours: number;
  /** Calls it made and received over the last day. */
  traffic: number;
}

interface CallGraphEdges {
  /** One per pair of services that call each other, sorted by pair. */
  edges: WeightedEdge[];
  /** Every service on the map, including those with no calls. */
  stats: Map<string, ServiceCallStats>;
}

/**
 * The calls between the map's services, for grouping. Both directions of a pair add up into one
 * edge weighing `log(1 + calls)`, so a busy pair counts more than a quiet one without outweighing
 * how services connect. Calls to services not on the map, to the service itself, or with no
 * counted calls are left out.
 */
export function getCallGraphEdges({
  callGraph,
  services,
}: {
  callGraph: MatchedServiceCallGraph;
  services: readonly string[];
}): CallGraphEdges {
  const onMap = new Set(services);
  // Calls between each pair of services, both ways, under the name that sorts first
  const pairs = new Map<string, Map<string, number>>();
  const callers = new Map<string, Set<string>>();
  const neighbours = new Map<string, Set<string>>();
  const traffic = new Map<string, number>();

  for (const [caller, callees] of Object.entries(callGraph)) {
    if (!onMap.has(caller)) {
      continue;
    }
    for (const { service: callee, calls } of callees) {
      if (!onMap.has(callee) || callee === caller || !(calls > 0)) {
        continue;
      }
      const [source, target] =
        compareNames(caller, callee) < 0 ? [caller, callee] : [callee, caller];
      const targets = pairs.get(source) ?? new Map<string, number>();
      targets.set(target, (targets.get(target) ?? 0) + calls);
      pairs.set(source, targets);

      addTo({ sets: callers, key: callee, value: caller });
      addTo({ sets: neighbours, key: caller, value: callee });
      addTo({ sets: neighbours, key: callee, value: caller });
      traffic.set(caller, (traffic.get(caller) ?? 0) + calls);
      traffic.set(callee, (traffic.get(callee) ?? 0) + calls);
    }
  }

  const edges = [...pairs]
    .flatMap(([source, targets]) =>
      [...targets].map(([target, calls]) => ({ source, target, weight: Math.log1p(calls) }))
    )
    .sort((a, b) => compareNames(a.source, b.source) || compareNames(a.target, b.target));

  const stats = new Map(
    services.map((service) => [
      service,
      {
        callers: callers.get(service)?.size ?? 0,
        neighbours: neighbours.get(service)?.size ?? 0,
        traffic: traffic.get(service) ?? 0,
      },
    ])
  );

  return { edges, stats };
}

function addTo({
  sets,
  key,
  value,
}: {
  sets: Map<string, Set<string>>;
  key: string;
  value: string;
}) {
  const set = sets.get(key) ?? new Set<string>();
  set.add(value);
  sets.set(key, set);
}
