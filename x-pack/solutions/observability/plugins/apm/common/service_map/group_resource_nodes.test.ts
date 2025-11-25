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
      expect(groupedNode?.data.label).toBe('4 resources');

      expect(result.elements.length).toBeLessThan(elements.length);
      expect(result.nodesCount).toBe(1);
    });

    it('should not group nodes when below minimum group size', () => {
      const elements: ConnectionElement[] = [
        nodeJsServiceNode,
        nodeJsExitSpanQuora,
        nodeJsExitSpanReddit,
        nodeJsExitSpanDoubleClick,
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanQuora.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanReddit.data.id),
        createMockEdge(nodeJsServiceNode.data.id, nodeJsExitSpanDoubleClick.data.id),
      ];

      const result = groupResourceNodes({ elements });

      expect(result.elements.length).toBe(elements.length);
      expect(result.nodesCount).toBe(4);
    });

    it('should group Kafka topics', () => {
      const javaService = createService({ serviceName: 'kafka-consumer', agentName: 'java' });
      const javaServiceNode = mockServiceNode(javaService);

      const kafkaOrders = mockExitSpanNode(
        createExitSpan({
          ...javaService,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/orders',
        })
      );
      const kafkaPayments = mockExitSpanNode(
        createExitSpan({
          ...javaService,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/payments',
        })
      );
      const kafkaNotifications = mockExitSpanNode(
        createExitSpan({
          ...javaService,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/notifications',
        })
      );
      const kafkaAnalytics = mockExitSpanNode(
        createExitSpan({
          ...javaService,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/analytics',
        })
      );
      const kafkaEvents = mockExitSpanNode(
        createExitSpan({
          ...javaService,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/events',
        })
      );

      const elements: ConnectionElement[] = [
        javaServiceNode,
        kafkaOrders,
        kafkaPayments,
        kafkaNotifications,
        kafkaAnalytics,
        kafkaEvents,
        createMockEdge(javaServiceNode.data.id, kafkaOrders.data.id),
        createMockEdge(javaServiceNode.data.id, kafkaPayments.data.id),
        createMockEdge(javaServiceNode.data.id, kafkaNotifications.data.id),
        createMockEdge(javaServiceNode.data.id, kafkaAnalytics.data.id),
        createMockEdge(javaServiceNode.data.id, kafkaEvents.data.id),
      ];

      const result = groupResourceNodes({ elements });

      const groupedNodes = result.elements.filter(
        (p): p is GroupedNode => 'groupedConnections' in p.data
      );

      const groupedNode = groupedNodes.find(
        (el: any) => el.data.id && el.data.id.startsWith('resourceGroup')
      );

      expect(groupedNode).toBeDefined();
      expect(groupedNode?.data.id).toBe(`resourceGroup{kafka-consumer}`);
      expect(groupedNode?.data.groupedConnections.length).toBe(5);
      expect(groupedNode?.data.label).toBe('5 resources');

      expect(result.elements.length).toBeLessThan(elements.length);
      expect(result.nodesCount).toBe(1);
    });

    it('should test mixed messaging systems grouping behavior', () => {
      const service = createService({ serviceName: 'messaging-producer', agentName: 'nodejs' });
      const serviceNode = mockServiceNode(service);

      // Kafka topics (4 resources)
      const kafkaOrders = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/orders',
        })
      );
      const kafkaPayments = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/payments',
        })
      );
      const kafkaNotifications = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/notifications',
        })
      );
      const kafkaAnalytics = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'kafka',
          spanDestinationServiceResource: 'kafka/analytics',
        })
      );

      // RabbitMQ queues (4 resources)
      const rabbitmqQueue1 = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'rabbitmq',
          spanDestinationServiceResource: 'rabbitmq/queue1',
        })
      );
      const rabbitmqQueue2 = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'rabbitmq',
          spanDestinationServiceResource: 'rabbitmq/queue2',
        })
      );
      const rabbitmqQueue3 = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'rabbitmq',
          spanDestinationServiceResource: 'rabbitmq/queue3',
        })
      );
      const rabbitmqQueue4 = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'rabbitmq',
          spanDestinationServiceResource: 'rabbitmq/queue4',
        })
      );

      // SQS queues (4 resources)
      const sqsNotifications = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'sqs',
          spanDestinationServiceResource: 'sqs/notifications',
        })
      );
      const sqsEvents = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'sqs',
          spanDestinationServiceResource: 'sqs/events',
        })
      );
      const sqsAlerts = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'sqs',
          spanDestinationServiceResource: 'sqs/alerts',
        })
      );
      const sqsLogs = mockExitSpanNode(
        createExitSpan({
          ...service,
          spanType: 'messaging',
          spanSubtype: 'sqs',
          spanDestinationServiceResource: 'sqs/logs',
        })
      );

      const elements: ConnectionElement[] = [
        serviceNode,
        kafkaOrders,
        kafkaPayments,
        kafkaNotifications,
        kafkaAnalytics,
        rabbitmqQueue1,
        rabbitmqQueue2,
        rabbitmqQueue3,
        rabbitmqQueue4,
        sqsNotifications,
        sqsEvents,
        sqsAlerts,
        sqsLogs,
        createMockEdge(serviceNode.data.id, kafkaOrders.data.id),
        createMockEdge(serviceNode.data.id, kafkaPayments.data.id),
        createMockEdge(serviceNode.data.id, kafkaNotifications.data.id),
        createMockEdge(serviceNode.data.id, kafkaAnalytics.data.id),
        createMockEdge(serviceNode.data.id, rabbitmqQueue1.data.id),
        createMockEdge(serviceNode.data.id, rabbitmqQueue2.data.id),
        createMockEdge(serviceNode.data.id, rabbitmqQueue3.data.id),
        createMockEdge(serviceNode.data.id, rabbitmqQueue4.data.id),
        createMockEdge(serviceNode.data.id, sqsNotifications.data.id),
        createMockEdge(serviceNode.data.id, sqsEvents.data.id),
        createMockEdge(serviceNode.data.id, sqsAlerts.data.id),
        createMockEdge(serviceNode.data.id, sqsLogs.data.id),
      ];

      const result = groupResourceNodes({ elements });

      const groupedNodes = result.elements.filter(
        (p): p is GroupedNode => 'groupedConnections' in p.data
      );

      // Should have 1 group containing all 12 resources (4 kafka + 4 rabbitmq + 4 sqs)
      expect(groupedNodes.length).toBe(1);

      const groupedNode = groupedNodes[0];
      expect(groupedNode).toBeDefined();
      expect(groupedNode.data.id).toBe(`resourceGroup{messaging-producer}`);
      expect(groupedNode.data.groupedConnections.length).toBe(12);
      expect(groupedNode.data.label).toBe('12 resources');

      // Verify the group contains mixed subtypes
      const subtypes = groupedNode.data.groupedConnections.map((conn: any) => conn['span.subtype']);
      const uniqueSubtypes = new Set(subtypes);
      expect(uniqueSubtypes.size).toBe(3); // kafka, rabbitmq, sqs
      expect(uniqueSubtypes).toEqual(new Set(['kafka', 'rabbitmq', 'sqs']));
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
