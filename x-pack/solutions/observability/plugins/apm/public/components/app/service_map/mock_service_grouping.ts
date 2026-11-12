/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapGrouping, ServiceMapGroup } from '../../../../common/service_map';

/**
 * Local-only preview until the server returns `serviceGrouping` (#300584).
 * Enable with feature flag + URL `?serviceMapMockGrouping=1`.
 *
 * Groups current map service names by shared name prefix (text before the first
 * `-`, `_`, `.`, `:`, or `/`). Prefixes with one service stay groups of 1 (drawn
 * as ordinary service nodes).
 */
export function buildMockServiceGrouping(serviceNames: string[]): ServiceMapGrouping {
  const services = [...new Set(serviceNames)].sort((a, b) => a.localeCompare(b));
  const membersByPrefix = new Map<string, string[]>();

  for (const name of services) {
    const prefix = getNamePrefix(name);
    const members = membersByPrefix.get(prefix) ?? [];
    members.push(name);
    membersByPrefix.set(prefix, members);
  }

  const prefixes = [...membersByPrefix.keys()].sort((a, b) => a.localeCompare(b));
  const groups: ServiceMapGroup[] = prefixes.map((prefix) => ({
    id: `namePrefix:${prefix}`,
    kind: 'attribute',
    attribute: 'namePrefix',
    value: prefix,
  }));
  const prefixToIndex = new Map(prefixes.map((prefix, index) => [prefix, index]));
  const assignment = services.map((name) => prefixToIndex.get(getNamePrefix(name)) ?? 0);

  return {
    services,
    automatic: 'namePrefix',
    strategies: [
      {
        source: 'namePrefix',
        passes: true,
        groups,
        assignment,
      },
    ],
  };
}

function getNamePrefix(serviceName: string): string {
  const match = serviceName.match(/^[^_\-.:/]+/);
  return match?.[0] ?? serviceName;
}
