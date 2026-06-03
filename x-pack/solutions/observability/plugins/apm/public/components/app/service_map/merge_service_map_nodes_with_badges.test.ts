/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { mergeServiceMapNodesWithBadges } from './merge_service_map_nodes_with_badges';

function serviceNode(id: string, label: string): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label,
      isService: true,
    },
  };
}

describe('mergeServiceMapNodesWithBadges', () => {
  it('merges alerts and SLO stats onto service nodes by label', () => {
    const nodes: ServiceMapNode[] = [serviceNode('a', 'svc-a'), serviceNode('b', 'svc-b')];

    const merged = mergeServiceMapNodesWithBadges(nodes, {
      alerts: [{ serviceName: 'svc-a', alertsCount: 3 }],
      slos: [{ serviceName: 'svc-b', sloStatus: 'violated', sloCount: 1 }],
    });

    expect(merged[0].data).toMatchObject({
      label: 'svc-a',
      alertsCount: 3,
    });
    expect(merged[1].data).toMatchObject({
      label: 'svc-b',
      sloStatus: 'violated',
      sloCount: 1,
    });
  });

  it('merges SLO stats when alerts are empty (SLO-only)', () => {
    const nodes: ServiceMapNode[] = [serviceNode('a', 'frontend')];

    const merged = mergeServiceMapNodesWithBadges(nodes, {
      alerts: [],
      slos: [{ serviceName: 'frontend', sloStatus: 'violated', sloCount: 1 }],
    });

    expect(merged[0].data).toMatchObject({
      label: 'frontend',
      sloStatus: 'violated',
      sloCount: 1,
    });
    expect(merged[0].data).not.toHaveProperty('alertsCount');
  });

  it('leaves dependency nodes unchanged', () => {
    const dep: ServiceMapNode = {
      id: 'ext',
      type: 'dependency',
      position: { x: 0, y: 0 },
      data: {
        id: 'ext',
        label: 'postgres',
        isService: false,
      },
    };

    const merged = mergeServiceMapNodesWithBadges([dep], {
      alerts: [{ serviceName: 'postgres', alertsCount: 9 }],
      slos: [],
    });

    expect(merged[0]).toEqual(dep);
  });
});
