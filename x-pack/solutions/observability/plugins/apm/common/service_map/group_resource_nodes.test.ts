/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionElement } from './types';
import type { GroupedNode } from './group_resource_nodes';
import { groupResourceNodes } from './group_resource_nodes';
import expectedGroupedData from '../../server/routes/service_map/mock_responses/group_resource_nodes_grouped.json';
import preGroupedData from '../../server/routes/service_map/mock_responses/group_resource_nodes_pregrouped.json';

describe('groupResourceNodes', () => {
  const createMockExitSpanNode = (
    id: string,
    spanType: string,
    spanSubtype: string,
    spanDestinationServiceResource: string,
    serviceName: string
  ): ConnectionElement => ({
    data: {
      id,
      'service.name': serviceName,
      'span.type': spanType,
      'span.subtype': spanSubtype,
      'span.destination.service.resource': spanDestinationServiceResource,
      label: `Node ${id}`,
    },
  });

  const createMockServiceNode = (id: string): ConnectionElement => ({
    data: {
      id,
      'service.name': id,
      'agent.name': 'java',
      'service.environment': 'production',
      label: `Node ${id}`,
    },
  });

  const createMockEdge = (source: string, target: string): ConnectionElement => ({
    data: {
      id: `${source}-${target}`,
      source,
      target,
    },
  });

  describe('basic grouping', () => {
    it('should group external nodes', () => {
      const responseWithGroups = groupResourceNodes(
        preGroupedData as { elements: ConnectionElement[] }
      );
      expect(responseWithGroups.elements).toHaveLength(expectedGroupedData.elements.length);
      for (const element of responseWithGroups.elements) {
        const expectedElement = expectedGroupedData.elements.find(
          ({ data: { id } }: { data: { id: string } }) => id === element.data.id
        )!;
        expect(element).toMatchObject(expectedElement);
      }
    });

    it('should group nodes when they meet minimum group size', () => {
      const elements: ConnectionElement[] = [
        // Create nodes
        createMockServiceNode('service1'),
        createMockExitSpanNode('service1', 'resource1', 'http', 'external', 'some-url'),
        createMockExitSpanNode('service1', 'resource2', 'http', 'external', 'some-url'),
        createMockExitSpanNode('service1', 'resource3', 'http', 'external', 'some-url'),
        createMockExitSpanNode('service1', 'resource4', 'http', 'external', 'some-url'),
        createMockEdge('service1', 'resource1'),
        createMockEdge('service1', 'resource2'),
        createMockEdge('service1', 'resource3'),
        createMockEdge('service1', 'resource4'),
      ];

      const result = groupResourceNodes({ elements });

      const groupedNodes = result.elements.filter(
        (p): p is GroupedNode => 'groupedConnections' in p.data
      );

      const groupedNode = groupedNodes.find(
        (el: any) => el.data.id && el.data.id.startsWith('resourceGroup')
      );

      expect(groupedNode).toBeDefined();
      expect(groupedNode?.data.id).toBe(`resourceGroup{service1}`);
      expect(groupedNode?.data.groupedConnections.length).toBe(4);

      expect(result.elements.length).toBeLessThan(elements.length);
      expect(result.nodesCount).toBe(1);
    });

    it('should not group nodes when below minimum group size', () => {
      const elements: ConnectionElement[] = [
        createMockServiceNode('service1'),
        createMockExitSpanNode('service1', 'resource1', 'http', 'external', 'some-url'),
        createMockExitSpanNode('service1', 'resource2', 'http', 'external', 'some-url'),
        createMockEdge('service1', 'resource1'),
        createMockEdge('service1', 'resource2'),
      ];

      const result = groupResourceNodes({ elements });

      expect(result.elements.length).toBe(elements.length);
      expect(result.nodesCount).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const result = groupResourceNodes({ elements: [] });
      expect(result.elements).toEqual([]);
      expect(result.nodesCount).toBe(0);
    });

    it('should handle input with no groupable nodes', () => {
      const elements: ConnectionElement[] = [
        createMockServiceNode('service1'),
        createMockServiceNode('service2'),
        createMockEdge('service1', 'service2'),
      ];

      const result = groupResourceNodes({ elements });
      expect(result.elements.length).toBe(elements.length);
      expect(result.nodesCount).toBe(2);
    });
  });
});
