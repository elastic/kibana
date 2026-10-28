/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceDependenciesResponse } from '@kbn/apm-api-shared';
import { NodeType } from '@kbn/apm-types';
import type { GroupedResource } from '../types';

export interface ResourceRow {
  resource: string;
  spanType?: string;
  spanSubtype?: string;
  latency: number | null;
  throughput: number | null;
  failureRate: number | null;
  totalTime: number;
  impact: number;
}

/**
 * Narrows the service's dependencies to the resources of a grouped edge and
 * sorts them by time consumed (descending). Resources without calls in the
 * time range are dropped.
 */
export function getTopResources({
  dependencies,
  groupedResources,
}: {
  dependencies: ServiceDependenciesResponse;
  groupedResources: GroupedResource[];
}): ResourceRow[] {
  const byResource = new Map(groupedResources.map((r) => [r.resource, r]));

  const rows: ResourceRow[] = [];
  for (const item of dependencies) {
    const { location } = item;
    if (location.type !== NodeType.dependency) continue;
    const grouped = byResource.get(location.dependencyName);
    if (!grouped) continue;

    rows.push({
      resource: grouped.resource,
      spanType: grouped.spanType ?? location.spanType,
      spanSubtype: grouped.spanSubtype ?? location.spanSubtype,
      latency: item.currentStats.latency.value,
      throughput: item.currentStats.throughput.value,
      failureRate: item.currentStats.errorRate.value,
      totalTime: item.currentStats.totalTime.value ?? 0,
      impact: item.currentStats.impact,
    });
  }

  return rows.sort((a, b) => b.totalTime - a.totalTime);
}
