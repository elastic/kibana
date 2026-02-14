/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType } from '@xyflow/react';
import { groupReactFlowNodes } from './group_react_flow_nodes';
import type {
  ServiceMapNode,
  ServiceMapEdge,
  DependencyNodeData,
  GroupedNodeData,
} from './react_flow_types';
import { DEFAULT_EDGE_COLOR, GROUPABLE_SPAN_SUBTYPE, GROUPABLE_SPAN_TYPE } from './constants';

function createServiceNode(id: string, label?: string): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: label || id,
      isService: true,
    },
  };
}

function createDependencyNode(id: string, spanType: string, spanSubtype?: string): ServiceMapNode {
  return {
    id,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: false,
      spanType,
      spanSubtype,
    } as DependencyNodeData,
  };
}

function createEdge(source: string, target: string): ServiceMapEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: 'default',
    style: { stroke: DEFAULT_EDGE_COLOR, strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: DEFAULT_EDGE_COLOR,
    },
    data: { isBidirectional: false },
  };
}

describe('groupReactFlowNodes', () => {
  describe('when there are no groupable nodes', () => {
    it('returns nodes and edges unchanged', () => {
      const nodes = [
        createServiceNode('service-a'),
        createServiceNode('service-b'),
        createServiceNode('service-c'),
      ];
      const edges = [createEdge('service-a', 'service-b'), createEdge('service-b', 'service-c')];

      const result = groupReactFlowNodes(nodes, edges);

      expect({ ...result, nodes: result.nodes.length, edges: result.edges.length }).toEqual({
        nodes: 3,
        edges: 2,
        nodesCount: 3,
      });
    });
  });

  describe('when there are less than 4 groupable nodes', () => {
    it('does NOT group 3 external nodes from the same source', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      expect({ nodes: result.nodes.length, edges: result.edges.length }).toEqual({
        nodes: 4,
        edges: 3,
      });

      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(0);
    });
  });

  describe('when there are 4+ groupable nodes from the same source', () => {
    it('groups 4 external nodes into a single grouped node', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // Should have: api-service + 1 grouped node = 2 nodes
      expect({ nodes: result.nodes.length, edges: result.edges.length }).toEqual({
        nodes: 2,
        edges: 1,
      });

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();
      expect(groupedNode!.data).toEqual(
        expect.objectContaining({
          isService: false,
          isGrouped: true,
          count: 4,
          groupedConnections: expect.arrayContaining([expect.anything()]),
        })
      );
      expect((groupedNode!.data as GroupedNodeData).groupedConnections).toHaveLength(4);
    });

    it('groups 5+ external nodes', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource5', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
        createEdge('api-service', 'resource5'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();

      const groupedData = groupedNode!.data as GroupedNodeData;
      expect(groupedData.count).toBe(5);
    });
  });

  describe('when nodes have different sources', () => {
    it('does NOT group nodes from different sources', () => {
      const nodes = [
        createServiceNode('service-a'),
        createServiceNode('service-b'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      // 2 from service-a, 2 from service-b
      const edges = [
        createEdge('service-a', 'resource1'),
        createEdge('service-a', 'resource2'),
        createEdge('service-b', 'resource3'),
        createEdge('service-b', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // No grouping should occur (less than 4 from each source)
      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(0);
    });
  });

  describe('when nodes share the same sources', () => {
    it('groups nodes that share the same sources', () => {
      const nodes = [
        createServiceNode('service-a'),
        createServiceNode('service-b'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      // All 4 resources connected from BOTH service-a AND service-b
      const edges = [
        createEdge('service-a', 'resource1'),
        createEdge('service-a', 'resource2'),
        createEdge('service-a', 'resource3'),
        createEdge('service-a', 'resource4'),
        createEdge('service-b', 'resource1'),
        createEdge('service-b', 'resource2'),
        createEdge('service-b', 'resource3'),
        createEdge('service-b', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // Should have: 2 services + 1 grouped node
      expect({ nodes: result.nodes.length, edges: result.edges.length }).toEqual({
        nodes: 3,
        edges: 2,
      });
      expect(result.nodes.find((n) => n.type === 'groupedResources')).toBeDefined();
    });
  });

  describe('edge styling', () => {
    it('styles grouped edges correctly', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toEqual(
        expect.objectContaining({
          type: 'default',
          style: { stroke: DEFAULT_EDGE_COLOR, strokeWidth: 1 },
          markerEnd: expect.objectContaining({
            type: MarkerType.ArrowClosed,
            color: DEFAULT_EDGE_COLOR,
          }),
        })
      );
    });
  });

  describe('node data preservation', () => {
    it('preserves spanType and spanSubtype in grouped node', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();
      expect(groupedNode!.data).toEqual(
        expect.objectContaining({
          spanType: GROUPABLE_SPAN_TYPE,
          spanSubtype: GROUPABLE_SPAN_SUBTYPE,
        })
      );
    });

    it('includes original node data in groupedConnections', () => {
      const nodes = [
        createServiceNode('api-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();

      const groupedData = groupedNode!.data as GroupedNodeData;
      expect(groupedData.groupedConnections).toHaveLength(4);
      expect(groupedData.groupedConnections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'resource1',
            label: 'resource1',
            spanType: GROUPABLE_SPAN_TYPE,
            spanSubtype: GROUPABLE_SPAN_SUBTYPE,
          }),
        ])
      );
    });
  });

  describe('outgoing edges from grouped nodes', () => {
    it('replaces outgoing edges from grouped nodes with edges from the group node', () => {
      const nodes = [
        createServiceNode('order-service'),
        createServiceNode('consumer-service'),
        createDependencyNode('kafka/orders', 'messaging', 'kafka'),
        createDependencyNode('kafka/payments', 'messaging', 'kafka'),
        createDependencyNode('kafka/notifications', 'messaging', 'kafka'),
        createDependencyNode('kafka/analytics', 'messaging', 'kafka'),
      ];
      const edges = [
        // Incoming edges: service -> kafka topics (these trigger grouping)
        createEdge('order-service', 'kafka/orders'),
        createEdge('order-service', 'kafka/payments'),
        createEdge('order-service', 'kafka/notifications'),
        createEdge('order-service', 'kafka/analytics'),
        // Outgoing messaging edges: kafka topics -> downstream consumer
        createEdge('kafka/orders', 'consumer-service'),
        createEdge('kafka/payments', 'consumer-service'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // The kafka topics should be grouped
      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(1);

      // No edge should reference a non-existent node
      const nodeIds = new Set(result.nodes.map((n) => n.id));
      for (const edge of result.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }

      // The group node should have an outgoing edge to consumer-service
      const groupId = groupedNodes[0].id;
      const outgoingFromGroup = result.edges.filter(
        (e) => e.source === groupId && e.target === 'consumer-service'
      );
      expect(outgoingFromGroup).toHaveLength(1);
    });

    it('creates outgoing edges from group node when a grouped node has downstream connections', () => {
      const nodes = [
        createServiceNode('api-service'),
        createServiceNode('downstream'),
        createDependencyNode('resource-0', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        // Incoming edges (will trigger grouping)
        createEdge('api-service', 'resource-0'),
        createEdge('api-service', 'resource-1'),
        createEdge('api-service', 'resource-2'),
        createEdge('api-service', 'resource-3'),
        // Outgoing edge from a node that will be grouped
        createEdge('resource-0', 'downstream'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // Verify no orphaned edges exist
      const nodeIds = new Set(result.nodes.map((n) => n.id));
      const orphanedEdges = result.edges.filter(
        (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target)
      );
      expect(orphanedEdges).toHaveLength(0);

      // The group node should connect to downstream
      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(1);
      const outgoingFromGroup = result.edges.filter(
        (e) => e.source === groupedNodes[0].id && e.target === 'downstream'
      );
      expect(outgoingFromGroup).toHaveLength(1);
    });

    it('preserves outgoing edges from non-grouped nodes', () => {
      const nodes = [
        createServiceNode('api-service'),
        createServiceNode('downstream'),
        createDependencyNode('resource-0', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource-3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        // Incoming edges (trigger grouping for resource-*)
        createEdge('api-service', 'resource-0'),
        createEdge('api-service', 'resource-1'),
        createEdge('api-service', 'resource-2'),
        createEdge('api-service', 'resource-3'),
        // Edge between two non-grouped nodes should be preserved
        createEdge('api-service', 'downstream'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // The api-service -> downstream edge should survive
      const serviceToDownstream = result.edges.find(
        (e) => e.source === 'api-service' && e.target === 'downstream'
      );
      expect(serviceToDownstream).toBeDefined();
    });
  });

  describe('mixed groupable and non-groupable nodes', () => {
    it('only groups eligible external nodes', () => {
      const nodes = [
        createServiceNode('api-service'),
        createServiceNode('backend-service'),
        createDependencyNode('resource1', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource2', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource3', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
        createDependencyNode('resource4', GROUPABLE_SPAN_TYPE, GROUPABLE_SPAN_SUBTYPE),
      ];
      const edges = [
        createEdge('api-service', 'backend-service'),
        createEdge('api-service', 'resource1'),
        createEdge('api-service', 'resource2'),
        createEdge('api-service', 'resource3'),
        createEdge('api-service', 'resource4'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // Should have: api-service + backend-service + grouped node = 3 nodes
      expect({ nodes: result.nodes.length, edges: result.edges.length }).toEqual({
        nodes: 3,
        edges: 2,
      });
      expect(result.nodes.map((n) => n.id)).toEqual(
        expect.arrayContaining(['api-service', 'backend-service'])
      );
    });

    it('does NOT group non-groupable span types like db', () => {
      const nodes = [
        createServiceNode('api-service'),
        // db spans are NOT groupable (NONGROUPED_SPANS has db: ['all'])
        createDependencyNode('db1:5432', 'db', 'postgresql'),
        createDependencyNode('db2:5432', 'db', 'postgresql'),
        createDependencyNode('db3:5432', 'db', 'postgresql'),
        createDependencyNode('db4:5432', 'db', 'postgresql'),
      ];
      const edges = [
        createEdge('api-service', 'db1:5432'),
        createEdge('api-service', 'db2:5432'),
        createEdge('api-service', 'db3:5432'),
        createEdge('api-service', 'db4:5432'),
      ];

      const result = groupReactFlowNodes(nodes, edges);

      // Should NOT group db nodes - all 5 nodes should remain
      expect({
        nodes: result.nodes.length,
        edges: result.edges.length,
        groupedNodes: result.nodes.filter((n) => n.type === 'groupedResources').length,
      }).toEqual({
        nodes: 5,
        edges: 4,
        groupedNodes: 0,
      });
    });
  });
});
