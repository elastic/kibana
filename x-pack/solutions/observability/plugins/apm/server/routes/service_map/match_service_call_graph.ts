/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../common/service_map/types';
import type { ServiceCallGraph } from './get_service_call_graph';
import { recordByService } from './record_by_service';

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
 * Turns each destination into a service on the map. The caller's own sample wins. A shared
 * resource is reused only when every sample names the same service, otherwise the host name is
 * used when that host is a service. Databases, external hosts, and a service calling itself are
 * dropped. Counts of destinations that resolve to the same service are added.
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
  const serviceByCaller = new Map<string, Map<string, string | undefined>>();
  const servicesForResource = new Map<string, Set<string>>();

  for (const span of spans) {
    if (span.serviceName) {
      services.add(span.serviceName);
    }
    const destinationService = span.destinationService?.serviceName;
    if (!destinationService) {
      continue;
    }
    services.add(destinationService);
    rememberSample(
      serviceByCaller,
      servicesForResource,
      span.serviceName,
      span.spanDestinationServiceResource,
      destinationService
    );
  }

  const matched = new Map<string, MatchedServiceCall[]>();
  for (const [source, destinations] of Object.entries(callGraph)) {
    if (!services.has(source)) {
      continue;
    }
    const totals = new Map<string, number>();
    for (const { destination, calls } of destinations) {
      const target = serviceForDestination(
        source,
        destination,
        serviceByCaller,
        servicesForResource,
        services
      );
      if (!target || target === source) {
        continue;
      }
      totals.set(target, (totals.get(target) ?? 0) + calls);
    }
    if (totals.size > 0) {
      matched.set(
        source,
        [...totals].map(([service, calls]) => ({ service, calls }))
      );
    }
  }
  return recordByService(matched);
}

/**
 * Records one sample. For this caller, the resource maps to one service, or to nothing when
 * this caller's samples disagree. Across callers, the resource keeps every service it was seen as.
 */
function rememberSample(
  serviceByCaller: Map<string, Map<string, string | undefined>>,
  servicesForResource: Map<string, Set<string>>,
  caller: string,
  resource: string,
  destinationService: string
) {
  const byResource = serviceByCaller.get(caller) ?? new Map<string, string | undefined>();
  if (!byResource.has(resource)) {
    byResource.set(resource, destinationService);
  } else if (byResource.get(resource) !== destinationService) {
    byResource.set(resource, undefined);
  }
  serviceByCaller.set(caller, byResource);

  const seen = servicesForResource.get(resource) ?? new Set<string>();
  seen.add(destinationService);
  servicesForResource.set(resource, seen);
}

function serviceForDestination(
  source: string,
  destination: string,
  serviceByCaller: ReadonlyMap<string, ReadonlyMap<string, string | undefined>>,
  servicesForResource: ReadonlyMap<string, ReadonlySet<string>>,
  services: ReadonlySet<string>
): string | undefined {
  const callerSamples = serviceByCaller.get(source);
  if (callerSamples?.has(destination)) {
    const fromCaller = callerSamples.get(destination);
    return fromCaller && services.has(fromCaller)
      ? fromCaller
      : serviceByHost(destination, services);
  }

  const seen = servicesForResource.get(destination);
  if (seen?.size === 1) {
    const [only] = seen;
    if (services.has(only)) {
      return only;
    }
  }
  return serviceByHost(destination, services);
}

function serviceByHost(destination: string, services: ReadonlySet<string>): string | undefined {
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
