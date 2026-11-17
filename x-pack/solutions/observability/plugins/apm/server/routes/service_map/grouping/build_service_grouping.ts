/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapGrouping } from '@kbn/apm-types';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import type { ServiceMapSpan, ServicesResponse } from '../../../../common/service_map/types';
import type { ServiceCallGraph } from '../get_service_call_graph';
import { getCallGraphEdges } from './call_graph_edges';
import { SERVICE_GROUPING_MIN_SERVICES } from './constants';
import { groupServicesByCalls } from './group_services_by_calls';
import { matchCallGraphToServices } from './match_service_call_graph';
import { compareNames } from './utils';

/**
 * Every grouping the map can show, for a map with enough services to need one. The map's services
 * are those the services query found plus those its sample of traces called or was called from,
 * as the map draws them.
 *
 * Grouping by calls is the only strategy so far. Until strategies are scored, it is the one shown
 * automatically and passes. With no calls between the map's services, every service is in the not
 * connected group, which tells the user calls are missing rather than hiding the grouping.
 */
export function buildServiceGrouping({
  callGraph,
  spans,
  servicesData,
}: {
  callGraph: ServiceCallGraph;
  spans: readonly ServiceMapSpan[];
  servicesData: readonly ServicesResponse[];
}): ServiceMapGrouping | undefined {
  const services = getMapServices({ spans, servicesData });
  if (services.length < SERVICE_GROUPING_MIN_SERVICES) {
    return undefined;
  }

  const matched = matchCallGraphToServices({ callGraph, spans, serviceNames: services });
  const { edges, stats } = getCallGraphEdges({ callGraph: matched, services });
  const calls = groupServicesByCalls({ services, edges, stats });

  return {
    services,
    // placeholders until strategies are scored against each other
    automatic: 'calls',
    strategies: [{ ...calls, passes: true }],
  };
}

/** The services the map draws, sorted, so every strategy's assignment indexes the same list. */
function getMapServices({
  spans,
  servicesData,
}: {
  spans: readonly ServiceMapSpan[];
  servicesData: readonly ServicesResponse[];
}): string[] {
  const services = new Set(servicesData.map((service) => service[SERVICE_NAME]));
  for (const { serviceName, destinationService } of spans) {
    services.add(serviceName);
    if (destinationService) {
      services.add(destinationService.serviceName);
    }
  }
  return [...services].sort(compareNames);
}
