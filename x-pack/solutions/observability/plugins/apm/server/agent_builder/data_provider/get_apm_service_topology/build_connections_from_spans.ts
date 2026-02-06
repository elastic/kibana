/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapSpan } from '../../../../common/service_map/types';
import type { ServiceTopologyNode, ExternalNode, ConnectionWithKey } from './types';

export function buildConnectionsFromSpans(spans: ServiceMapSpan[]): ConnectionWithKey[] {
  const connectionMap = new Map<string, ConnectionWithKey>();

  for (const span of spans) {
    const source: ServiceTopologyNode = {
      'service.name': span.serviceName,
    };

    let target: ServiceTopologyNode | ExternalNode;

    if (span.destinationService) {
      // Target is another service
      target = {
        'service.name': span.destinationService.serviceName,
      };
    } else {
      // Target is an external dependency
      target = {
        'span.destination.service.resource': span.spanDestinationServiceResource,
        'span.type': span.spanType,
        'span.subtype': span.spanSubtype,
      };
    }

    // Create a unique key for deduplication using source service + dependency resource
    const sourceName = source['service.name'];
    const dependencyName = span.spanDestinationServiceResource;
    const connectionKey = `${sourceName}::${dependencyName}`;

    if (!connectionMap.has(connectionKey)) {
      connectionMap.set(connectionKey, {
        source,
        target,
        metrics: null,

        // internal fields, not part of the public API
        _key: connectionKey, // deduplication key
        _sourceName: sourceName,
        _dependencyName: dependencyName,
      });
    }
  }

  return Array.from(connectionMap.values());
}
