/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectionElement, ServiceMapExitSpan, ServiceMapService } from './types';
import type { GroupedNode } from './types';
import { groupResourceNodes } from './group_resource_nodes';
import { getEdgeId, getExternalConnectionNode, getServiceConnectionNode } from './utils';

describe('groupResourceNodes', () => {
  const createService = (service: { serviceName: string; agentName: string }) =>
    ({
      ...service,
      serviceEnvironment: 'production',
    } as ServiceMapService);

  /**
   * Helper function to generate an external connection node.
   */
  const createExitSpan = (exitSpan: {
    agentName?: string;
    serviceName?: string;
    spanType: string;
    spanSubtype: string;
    spanDestinationServiceResource: string;
  }) =>
    ({
      ...exitSpan,
      serviceEnvironment: 'production',
    } as ServiceMapExitSpan);

  const nodejsService = createService({ serviceName: 'opbeans-node', agentName: 'nodejs' });

  const mockServiceNode = (service: ServiceMapService): ConnectionElement => ({
    data: getServiceConnectionNode(service),
  });

  const mockExitSpanNode = (exitSpan: ServiceMapExitSpan): ConnectionElement => ({
    data: getExternalConnectionNode(exitSpan),
  });

  const nodeJsServiceNode = mockServiceNode(nodejsService);
  const nodeJsExitSpanQuora = mockExitSpanNode(
    createExitSpan({
      ...nodejsService,
      spanType: 'http',
      spanSubtype: 'external',
      spanDestinationServiceResource: 'a.quora.com:443',
    })
  );
  const nodeJsExitSpanReddit = mockExitSpanNode(
    createExitSpan({
      ...nodejsService,
      spanType: 'http',
      spanSubtype: 'external',
      spanDestinationServiceResource: 'alb.reddit.com:443',
    })
  );
  const nodeJsExitSpanDoubleClick = mockExitSpanNode(
    createExitSpan({
      ...nodejsService,
      spanType: 'http',
      spanSubtype: 'external',
      spanDestinationServiceResource: 'ad.doubleclick.net:443',
    })
  );
  const nodeJsExitSpanOptimizely = mockExitSpanNode(
    createExitSpan({
      ...nodejsService,
      spanType: 'http',
      spanSubtype: 'external',
      spanDestinationServiceResource: 'tapi.optimizely.com:443',
    })
  );

  const createMockEdge = (source: string, target: string): ConnectionElement => ({
    data: {
      id: getEdgeId(source, target),
      source,
      target,
    },
  });

  describe('basic grouping', () => {
    it('should group external nodes', () => {
      const elements: ConnectionElement[] = [
        nodeJsServiceNode,
        nodeJsExitSpanQuora,
        nodeJsExitSpanReddit,
        nodeJsExitSpanDoubleClick,
        nodeJsExitSpanOptimizely,
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanQuora.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanReddit.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanDoubleClick.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanOptimizely.data.id),
      ];

      const result = groupResourceNodes({ elements });

      const groupedNodes = result.elements.filter(
        (p): p is GroupedNode => 'groupedConnections' in p.data
      );

      const groupedNode = groupedNodes.find(
        (el: any) => el.data.id && el.data.id.startsWith('resourceGroup')
      );

      expect(groupedNode).toBeDefined();
      expect(groupedNode?.data.id).toBe(`resourceGroup{opbeans-node}`);
      expect(groupedNode?.data.groupedConnections.length).toBe(4);

      expect(result.elements.length).toBeLessThan(elements.length);
      expect(result.nodesCount).toBe(1);
    });

    it('should not group nodes when below minimum group size', () => {
      const elements: ConnectionElement[] = [
        nodeJsServiceNode,
        nodeJsExitSpanQuora,
        nodeJsExitSpanReddit,
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanQuora.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanReddit.data.id),
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
      const svc1 = mockServiceNode(createService({ serviceName: 'service1', agentName: 'nodejs' }));
      const svc2 = mockServiceNode(createService({ serviceName: 'service2', agentName: 'nodejs' }));
      const elements: ConnectionElement[] = [
        svc1,
        svc2,
        createMockEdge(svc1.data.id, svc2.data.id),
      ];

      const result = groupResourceNodes({ elements });
      expect(result.elements.length).toBe(elements.length);
      expect(result.nodesCount).toBe(2);
    });
  });
});
