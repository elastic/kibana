/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { computeServiceMapFilterOptionCounts } from './service_map_filter_option_counts';

function mkService(id: string, sloStatus?: 'healthy' | 'violated' | 'noSLOs'): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: true,
      ...(sloStatus !== undefined ? { sloStatus } : {}),
    },
  };
}

describe('computeServiceMapFilterOptionCounts', () => {
  it('counts sloStatus noSLOs in the noData bucket', () => {
    const nodes: ServiceMapNode[] = [
      mkService('a', 'noSLOs'),
      mkService('b', 'healthy'),
      mkService('c'),
    ];
    const { slo } = computeServiceMapFilterOptionCounts(nodes);
    expect(slo.noData).toBe(2);
    expect(slo.healthy).toBe(1);
    expect(slo.violated).toBe(0);
    expect(slo.degrading).toBe(0);
  });
});
