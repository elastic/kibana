/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapAttachmentData } from './service_map';
import { getTopologyNodeId, transformTopologyToServiceMap } from './service_map_transform';

const serviceNode = (name: string, agentName?: string) => ({
  'service.name': name,
  ...(agentName ? { 'agent.name': agentName } : {}),
});

const externalNode = (resource: string, type?: string, subtype?: string) => ({
  'span.destination.service.resource': resource,
  ...(type ? { 'span.type': type } : {}),
  ...(subtype ? { 'span.subtype': subtype } : {}),
});

describe('transformTopologyToServiceMap', () => {
  it('derives typed nodes and edges with APM id conventions', () => {
    const { nodes, edges } = transformTopologyToServiceMap({
      connections: [
        {
          source: serviceNode('opbeans-java', 'java'),
          target: externalNode('postgresql', 'db', 'postgresql'),
          metrics: { latencyMs: 12, throughputPerMin: 100, errorRate: 0.5 },
        },
        {
          source: serviceNode('opbeans-node', 'nodejs'),
          target: serviceNode('opbeans-java', 'java'),
        },
      ],
    });

    expect(nodes.map((node) => node.id).sort()).toEqual([
      '>postgresql',
      'opbeans-java',
      'opbeans-node',
    ]);

    const javaNode = nodes.find((node) => node.id === 'opbeans-java');
    expect(javaNode).toMatchObject({
      type: 'service',
      data: { id: 'opbeans-java', label: 'opbeans-java', isService: true, agentName: 'java' },
    });

    const dbNode = nodes.find((node) => node.id === '>postgresql');
    expect(dbNode).toMatchObject({
      type: 'dependency',
      data: {
        id: '>postgresql',
        label: 'postgresql',
        isService: false,
        spanType: 'db',
        spanSubtype: 'postgresql',
      },
    });

    expect(edges.map((edge) => edge.id).sort()).toEqual([
      'opbeans-java~>postgresql',
      'opbeans-node~opbeans-java',
    ]);
    const dbEdge = edges.find((edge) => edge.id === 'opbeans-java~>postgresql');
    expect(dbEdge).toMatchObject({
      type: 'default',
      source: 'opbeans-java',
      target: '>postgresql',
      data: {
        isBidirectional: false,
        metrics: { latencyMs: 12, throughputPerMin: 100, errorRate: 0.5 },
      },
    });
    expect(dbEdge?.markerEnd).toBeDefined();
    expect(dbEdge?.markerStart).toBeUndefined();
  });

  it('populates edge sourceData/targetData for the dependency stats popover', () => {
    const { edges } = transformTopologyToServiceMap({
      connections: [
        {
          source: serviceNode('opbeans-java', 'java'),
          target: externalNode('elasticsearch'),
        },
      ],
    });

    expect(edges[0].data?.sourceData).toEqual({
      id: 'opbeans-java',
      'service.name': 'opbeans-java',
      'agent.name': 'java',
      'service.environment': null,
    });
    // Optional span.type/span.subtype default to '' to satisfy the
    // ExternalConnectionNode contract used by the popover.
    expect(edges[0].data?.targetData).toEqual({
      id: '>elasticsearch',
      'span.destination.service.resource': 'elasticsearch',
      'span.type': '',
      'span.subtype': '',
    });
  });

  it('merges nodeMetadata badges into service node data', () => {
    const { nodes } = transformTopologyToServiceMap({
      connections: [
        {
          source: serviceNode('opbeans-java', 'java'),
          target: serviceNode('opbeans-node', 'nodejs'),
        },
      ],
      nodeMetadata: {
        'opbeans-java': { alertsCount: 3, sloStatus: 'violated', sloCount: 2 },
      },
    });

    expect(nodes.find((node) => node.id === 'opbeans-java')?.data).toMatchObject({
      alertsCount: 3,
      sloStatus: 'violated',
      sloCount: 2,
    });
    expect(nodes.find((node) => node.id === 'opbeans-node')?.data).toMatchObject({
      alertsCount: undefined,
      sloStatus: undefined,
    });
  });

  it('collapses A→B and B→A into a single bidirectional edge and dedupes repeats', () => {
    const { edges } = transformTopologyToServiceMap({
      connections: [
        { source: serviceNode('a'), target: serviceNode('b') },
        { source: serviceNode('b'), target: serviceNode('a') },
        { source: serviceNode('a'), target: serviceNode('b') },
      ],
    });

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      id: 'a~b',
      data: { isBidirectional: true },
    });
    expect(edges[0].markerStart).toBeDefined();
    expect(edges[0].markerEnd).toBeDefined();
  });

  it('drops self-referencing connections', () => {
    const { nodes, edges } = transformTopologyToServiceMap({
      connections: [{ source: serviceNode('a'), target: serviceNode('a') }],
    });

    expect(nodes.map((node) => node.id)).toEqual(['a']);
    expect(edges).toHaveLength(0);
  });

  it('groups external resource nodes like the full service map', () => {
    // 4 groupable external targets (MINIMUM_GROUP_SIZE) sharing one source.
    // `external`/`http` is groupable; `db` spans are not (NONGROUPED_SPANS).
    const connections: ServiceMapAttachmentData['connections'] = [1, 2, 3, 4].map((i) => ({
      source: serviceNode('opbeans-java', 'java'),
      target: externalNode(`api-${i}.example.com:443`, 'external', 'http'),
    }));

    const { nodes, edges } = transformTopologyToServiceMap({ connections });

    const groupedNode = nodes.find((node) => 'isGrouped' in node.data);
    expect(groupedNode).toBeDefined();
    expect(nodes).toHaveLength(2); // service + grouped resources
    expect(edges).toHaveLength(1);
  });
});

describe('getTopologyNodeId', () => {
  it('uses service.name for services and >resource for externals', () => {
    expect(getTopologyNodeId(serviceNode('opbeans-java'))).toBe('opbeans-java');
    expect(getTopologyNodeId(externalNode('postgresql'))).toBe('>postgresql');
  });
});
