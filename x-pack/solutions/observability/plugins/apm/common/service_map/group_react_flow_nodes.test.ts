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

const DEFAULT_EDGE_COLOR = '#98A2B3';

// Note: 'db' and 'cache' types with 'all' are NOT groupable per NONGROUPED_SPANS config.
// Use 'external' with 'http' subtype are groupable nodes.
const GROUPABLE_SPAN_TYPE = 'external';
const GROUPABLE_SPAN_SUBTYPE = 'http';

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
    it('should return nodes and edges unchanged', () => {
      const nodes = [
        createServiceNode('service-a'),
        createServiceNode('service-b'),
        createServiceNode('service-c'),
      ];
      const edges = [createEdge('service-a', 'service-b'), createEdge('service-b', 'service-c')];

      const result = groupReactFlowNodes(nodes, edges);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.nodesCount).toBe(3);
    });
  });

  describe('when there are less than 4 groupable nodes', () => {
    it('should NOT group 3 external nodes from the same source', () => {
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

      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(3);

      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(0);
    });
  });

  describe('when there are 4+ groupable nodes from the same source', () => {
    it('should group 4 external nodes into a single grouped node', () => {
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
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();
      expect(groupedNode!.data.isService).toBe(false);

      const groupedData = groupedNode!.data as GroupedNodeData;
      expect(groupedData.isGrouped).toBe(true);
      expect(groupedData.count).toBe(4);
      expect(groupedData.groupedConnections).toHaveLength(4);
    });

    it('should group 5+ external nodes', () => {
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
    it('should NOT group nodes from different sources', () => {
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
    it('should group nodes that share the same sources', () => {
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
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      const groupedNode = result.nodes.find((n) => n.type === 'groupedResources');
      expect(groupedNode).toBeDefined();
    });
  });

  describe('edge styling', () => {
    it('should style grouped edges correctly', () => {
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
      const groupedEdge = result.edges[0];
      expect(groupedEdge.type).toBe('default');
      expect(groupedEdge.style).toEqual({ stroke: DEFAULT_EDGE_COLOR, strokeWidth: 1 });
      expect(groupedEdge.markerEnd).toMatchObject({
        type: MarkerType.ArrowClosed,
        color: DEFAULT_EDGE_COLOR,
      });
    });
  });

  describe('node data preservation', () => {
    it('should preserve spanType and spanSubtype in grouped node', () => {
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
      expect(groupedData.spanType).toBe(GROUPABLE_SPAN_TYPE);
      expect(groupedData.spanSubtype).toBe(GROUPABLE_SPAN_SUBTYPE);
    });

    it('should include original node data in groupedConnections', () => {
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

      const resource1 = groupedData.groupedConnections.find((c) => c.id === 'resource1');
      expect(resource1).toBeDefined();
      expect(resource1!.label).toBe('resource1');
      expect(resource1!.spanType).toBe(GROUPABLE_SPAN_TYPE);
      expect(resource1!.spanSubtype).toBe(GROUPABLE_SPAN_SUBTYPE);
    });
  });

  describe('mixed groupable and non-groupable nodes', () => {
    it('should only group eligible external nodes', () => {
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
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);

      expect(result.nodes.find((n) => n.id === 'api-service')).toBeDefined();
      expect(result.nodes.find((n) => n.id === 'backend-service')).toBeDefined();
    });

    it('should NOT group non-groupable span types like db', () => {
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
      expect(result.nodes).toHaveLength(5);
      expect(result.edges).toHaveLength(4);

      const groupedNodes = result.nodes.filter((n) => n.type === 'groupedResources');
      expect(groupedNodes).toHaveLength(0);
    });
  });
});
