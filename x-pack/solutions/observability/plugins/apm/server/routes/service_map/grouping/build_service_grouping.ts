/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceGroupingStrategy, ServiceMapGrouping } from '@kbn/apm-types';
import type { ServiceMapSpan } from '../../../../common/service_map/types';
import type { ServiceCallGraph } from '../get_service_call_graph';
import type { ServiceGroupingAttributes } from '../get_service_grouping_attributes';
import { getCallGraphEdges } from './call_graph_edges';
import { SERVICE_GROUPING_MIN_SERVICES } from './constants';
import { groupServicesByAttribute } from './group_services_by_attribute';
import { groupServicesByCalls } from './group_services_by_calls';
import { matchCallGraphToServices } from './match_service_call_graph';

/**
 * Every grouping the map can show, for a map with enough services to need one. `services` is the
 * sorted list from `getMapServices`, and every strategy's assignment indexes it.
 *
 * Services are grouped by their calls, and by `service.namespace` when any of them sets one. Until
 * strategies are scored, grouping by calls is the one shown automatically and the only one that
 * passes. With no calls between the map's services, every service is in the not connected group,
 * which tells the user calls are missing rather than hiding the grouping.
 */
export function buildServiceGrouping({
  callGraph,
  spans,
  services,
  attributes,
}: {
  callGraph: ServiceCallGraph;
  spans: readonly ServiceMapSpan[];
  services: readonly string[];
  /** Labels of the drawn services. Missing when they could not be read. */
  attributes?: ServiceGroupingAttributes;
}): Omit<ServiceMapGrouping, 'services'> | undefined {
  if (services.length < SERVICE_GROUPING_MIN_SERVICES) {
    return undefined;
  }

  const matched = matchCallGraphToServices({ callGraph, spans, serviceNames: services });
  const { edges, stats } = getCallGraphEdges({ callGraph: matched, services });
  const calls = groupServicesByCalls({ services, edges, stats });
  const strategies: ServiceGroupingStrategy[] = [{ ...calls, passes: true }];

  const serviceNamespaceOf = (service: string) => attributes?.[service]?.serviceNamespace;
  if (services.some(serviceNamespaceOf)) {
    strategies.push({
      ...groupServicesByAttribute({
        source: 'service.namespace',
        services,
        valueOf: serviceNamespaceOf,
      }),
      passes: false,
    });
  }

  return {
    // placeholders until strategies are scored against each other
    automatic: 'calls',
    strategies,
  };
}
