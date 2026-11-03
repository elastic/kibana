/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceDependenciesResponse } from '@kbn/apm-api-shared';
import { NodeType } from '@kbn/apm-types';
import { getTopResources } from './get_top_resources';

const dependency = (dependencyName: string, totalTime: number, impact: number) =>
  ({
    location: {
      id: dependencyName,
      type: NodeType.dependency,
      dependencyName,
      spanType: 'db',
      spanSubtype: 'redis',
    },
    currentStats: {
      latency: { value: 10 },
      throughput: { value: 5 },
      errorRate: { value: 0.1 },
      totalTime: { value: totalTime },
      impact,
    },
    previousStats: null,
  } as unknown as ServiceDependenciesResponse[number]);

describe('getTopResources', () => {
  const grouped = [{ resource: 'redis-1' }, { resource: 'redis-2' }, { resource: 'redis-3' }];

  it('keeps only the grouped resources, sorted by time consumed', () => {
    const rows = getTopResources({
      dependencies: [
        dependency('redis-1', 100, 10),
        dependency('postgres', 9999, 99),
        dependency('redis-2', 300, 30),
      ],
      groupedResources: grouped,
    });

    expect(rows.map((r) => r.resource)).toEqual(['redis-2', 'redis-1']);
  });

  it('uses the stats of the dependency', () => {
    const [row] = getTopResources({
      dependencies: [dependency('redis-1', 100, 10)],
      groupedResources: grouped,
    });

    expect(row).toMatchObject({
      latency: 10,
      throughput: 5,
      failureRate: 0.1,
      impact: 10,
      spanSubtype: 'redis',
    });
  });

  it('ignores service locations', () => {
    const service = {
      location: { id: 's', type: NodeType.service, serviceName: 'redis-1' },
      currentStats: { totalTime: { value: 1 } },
    } as unknown as ServiceDependenciesResponse[number];

    expect(getTopResources({ dependencies: [service], groupedResources: grouped })).toEqual([]);
  });
});
