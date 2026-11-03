/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../common/service_map/types';
import type { ServiceCallGraph } from './get_service_call_graph';

export interface MatchedServiceCall {
  service: string;
  calls: number;
}

/** Service-to-service calls, keyed by the caller. */
export type MatchedServiceCallGraph = Record<string, MatchedServiceCall[]>;

type CallGraphSpan = Pick<
  ServiceMapSpan,
  'serviceName' | 'spanDestinationServiceResource' | 'destinationService'
>;

/**
 * Turns each destination into a service on the map. The trace sample's edge wins, otherwise the
 * host name is used when that host is a service. Databases, external hosts, and a service calling
 * itself are dropped. Counts of destinations that resolve to the same service are added.
 */
export function matchCallGraphToServices({
  callGraph,
  spans,
  serviceNames,
}: {
  callGraph: ServiceCallGraph;
  spans: readonly CallGraphSpan[];
  serviceNames: Iterable<string>;
}): MatchedServiceCallGraph {
  const services = new Set(serviceNames);
  const serviceOfDestination = new Map<string, string>();

  for (const span of spans) {
    if (span.serviceName) {
      services.add(span.serviceName);
    }
    const destinationService = span.destinationService?.serviceName;
    if (!destinationService) {
      continue;
    }
    services.add(destinationService);
    serviceOfDestination.set(span.spanDestinationServiceResource, destinationService);
  }

  const matched: MatchedServiceCallGraph = {};
  for (const [source, destinations] of Object.entries(callGraph)) {
    if (!services.has(source)) {
      continue;
    }
    const totals = new Map<string, number>();
    for (const { destination, calls } of destinations) {
      const target = serviceForDestination(destination, serviceOfDestination, services);
      if (!target || target === source) {
        continue;
      }
      totals.set(target, (totals.get(target) ?? 0) + calls);
    }
    if (totals.size > 0) {
      matched[source] = [...totals].map(([service, calls]) => ({ service, calls }));
    }
  }
  return matched;
}

function serviceForDestination(
  destination: string,
  serviceOfDestination: ReadonlyMap<string, string>,
  services: ReadonlySet<string>
): string | undefined {
  const fromSample = serviceOfDestination.get(destination);
  if (fromSample && services.has(fromSample)) {
    return fromSample;
  }
  const host = destinationHost(destination);
  return services.has(host) ? host : undefined;
}

/** `cart:8080` and `http://cart:8080/x` both give `cart`. An IPv6 host keeps its brackets. */
function destinationHost(destination: string): string {
  const afterScheme = destination.split('://').pop() ?? destination;
  const hostAndPort = afterScheme.split('/')[0] ?? afterScheme;
  if (hostAndPort.includes(':') && !hostAndPort.includes(']')) {
    return hostAndPort.slice(0, hostAndPort.lastIndexOf(':'));
  }
  return hostAndPort;
}
