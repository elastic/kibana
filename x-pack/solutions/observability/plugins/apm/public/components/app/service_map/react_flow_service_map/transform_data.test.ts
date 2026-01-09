/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MarkerType } from '@xyflow/react';
import type { ElementDefinition } from 'cytoscape';
import { ServiceHealthStatus } from '../../../../../common/service_health_status';
import { transformElements } from './transform_data';

const DEFAULT_COLOR = '#98A2B3';

describe('transformElements', () => {
  describe('when transforming nodes', () => {
    it('should transform a service node correctly', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'opbeans-java',
            'service.name': 'opbeans-java',
            'agent.name': 'java',
          },
        },
      ];

      const { nodes, edges } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes).toHaveLength(1);
      expect(edges).toHaveLength(0);

      const node = nodes[0];
      expect(node.id).toBe('opbeans-java');
      expect(node.type).toBe('service');
      expect(node.position).toEqual({ x: 0, y: 0 });
      expect(node.data).toEqual({
        id: 'opbeans-java',
        label: 'opbeans-java',
        agentName: 'java',
        spanType: undefined,
        spanSubtype: undefined,
        serviceAnomalyStats: undefined,
        isService: true,
      });
    });

    it('should transform a dependency node correctly', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'postgresql',
            'span.type': 'db',
            'span.subtype': 'postgresql',
            'span.destination.service.resource': 'postgresql',
          },
        },
      ];

      const { nodes, edges } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes).toHaveLength(1);
      expect(edges).toHaveLength(0);

      const node = nodes[0];
      expect(node.id).toBe('postgresql');
      expect(node.type).toBe('dependency');
      expect(node.data).toEqual({
        id: 'postgresql',
        label: 'postgresql',
        agentName: undefined,
        spanType: 'db',
        spanSubtype: 'postgresql',
        serviceAnomalyStats: undefined,
        isService: false,
      });
    });

    it('should use label as fallback when service.name is not present', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'external-service',
            label: 'External Service',
          },
        },
      ];

      const { nodes } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes[0].data.label).toBe('External Service');
      expect(nodes[0].data.isService).toBe(false);
    });

    it('should use span.destination.service.resource as fallback for label', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'redis-cache',
            'span.destination.service.resource': 'redis:6379',
          },
        },
      ];

      const { nodes } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes[0].data.label).toBe('redis:6379');
    });

    it('should use id as last fallback for label', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'unknown-node-123',
          },
        },
      ];

      const { nodes } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes[0].data.label).toBe('unknown-node-123');
    });

    it('should include serviceAnomalyStats when present', () => {
      const elements: ElementDefinition[] = [
        {
          data: {
            id: 'opbeans-python',
            'service.name': 'opbeans-python',
            serviceAnomalyStats: {
              healthStatus: ServiceHealthStatus.warning,
            },
          },
        },
      ];

      const { nodes } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes[0].data.serviceAnomalyStats).toEqual({
        healthStatus: ServiceHealthStatus.warning,
      });
    });
  });

  describe('when transforming edges', () => {
    it('should transform a simple edge correctly', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { id: 'edge-1', source: 'service-a', target: 'service-b' } },
      ];

      const { nodes, edges } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes).toHaveLength(2);
      expect(edges).toHaveLength(1);

      const edge = edges[0];
      expect(edge.id).toBe('edge-1');
      expect(edge.source).toBe('service-a');
      expect(edge.target).toBe('service-b');
      expect(edge.type).toBe('default');
      expect(edge.style).toEqual({ stroke: DEFAULT_COLOR, strokeWidth: 1 });
      expect(edge.markerEnd).toEqual({
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: DEFAULT_COLOR,
      });
      expect(edge.markerStart).toBeUndefined();
      expect(edge.data?.isBidirectional).toBe(false);
    });

    it('should generate edge id from source and target when id is not provided', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { source: 'service-a', target: 'service-b' } },
      ];

      const { edges } = transformElements(elements, DEFAULT_COLOR);

      expect(edges[0].id).toBe('service-a-service-b');
    });

    it('should detect bidirectional edges and add markerStart', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { id: 'edge-1', source: 'service-a', target: 'service-b' } },
        { data: { id: 'edge-2', source: 'service-b', target: 'service-a' } },
      ];

      const { edges } = transformElements(elements, DEFAULT_COLOR);

      // Both edges should be present, but the second one marks both as bidirectional
      expect(edges).toHaveLength(2);

      // The second edge (service-b -> service-a) should be marked as bidirectional
      const edge2 = edges.find((e) => e.id === 'edge-2');
      expect(edge2?.data?.isBidirectional).toBe(true);
      expect(edge2?.markerStart).toEqual({
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: DEFAULT_COLOR,
      });
    });

    it('should respect explicit bidirectional flag', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { id: 'edge-1', source: 'service-a', target: 'service-b', bidirectional: true } },
      ];

      const { edges } = transformElements(elements, DEFAULT_COLOR);

      expect(edges[0].data?.isBidirectional).toBe(true);
      expect(edges[0].markerStart).toBeDefined();
    });

    it('should skip inverse edges', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { id: 'edge-1', source: 'service-a', target: 'service-b' } },
        {
          data: {
            id: 'edge-inverse',
            source: 'service-b',
            target: 'service-a',
            isInverseEdge: true,
          },
        },
      ];

      const { edges } = transformElements(elements, DEFAULT_COLOR);

      expect(edges).toHaveLength(1);
      expect(edges[0].id).toBe('edge-1');
    });

    it('should apply custom default color to edges', () => {
      const customColor = '#0000FF';
      const elements: ElementDefinition[] = [
        { data: { id: 'service-a', 'service.name': 'service-a' } },
        { data: { id: 'service-b', 'service.name': 'service-b' } },
        { data: { source: 'service-a', target: 'service-b' } },
      ];

      const { edges } = transformElements(elements, customColor);

      expect(edges[0].style?.stroke).toBe(customColor);
      expect((edges[0].markerEnd as { color: string }).color).toBe(customColor);
    });
  });

  describe('when transforming mixed elements', () => {
    it('should handle empty elements array', () => {
      const { nodes, edges } = transformElements([], DEFAULT_COLOR);

      expect(nodes).toHaveLength(0);
      expect(edges).toHaveLength(0);
    });

    it('should handle elements with missing data', () => {
      const elements: ElementDefinition[] = [{ data: {} } as ElementDefinition];

      const { nodes, edges } = transformElements(elements, DEFAULT_COLOR);

      // Element with empty data should be treated as a node with undefined values
      expect(nodes).toHaveLength(1);
      expect(edges).toHaveLength(0);
    });

    it('should correctly separate nodes and edges from mixed input', () => {
      const elements: ElementDefinition[] = [
        { data: { id: 'opbeans-java', 'service.name': 'opbeans-java', 'agent.name': 'java' } },
        {
          data: { id: 'opbeans-python', 'service.name': 'opbeans-python', 'agent.name': 'python' },
        },
        { data: { id: 'postgresql', 'span.type': 'db', 'span.subtype': 'postgresql' } },
        { data: { id: 'edge-1', source: 'opbeans-java', target: 'opbeans-python' } },
        { data: { id: 'edge-2', source: 'opbeans-python', target: 'postgresql' } },
      ];

      const { nodes, edges } = transformElements(elements, DEFAULT_COLOR);

      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(2);

      // Verify node types
      expect(nodes.find((n) => n.id === 'opbeans-java')?.type).toBe('service');
      expect(nodes.find((n) => n.id === 'opbeans-python')?.type).toBe('service');
      expect(nodes.find((n) => n.id === 'postgresql')?.type).toBe('dependency');
    });
  });
});
