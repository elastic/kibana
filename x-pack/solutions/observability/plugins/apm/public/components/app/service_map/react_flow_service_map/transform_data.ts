/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, EdgeMarker, Node } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type cytoscape from 'cytoscape';
import type { ServiceHealthStatus } from '../../../../../common/service_health_status';
import type { ServiceMapNodeData } from './service_node';

// Edge data interface
export interface ServiceMapEdgeData {
  isBidirectional?: boolean;
}

/**
 * Transform Cytoscape elements to React Flow format
 * Converts nodes and edges from Cytoscape's data structure to React Flow's format
 * Ideally this should be done on the server side to avoid the need to transform the data in the browser
 * If we proceed with this POC, we should move this to the server side and remove this function
 */
export function transformElements(
  elements: cytoscape.ElementDefinition[],
  defaultColor: string
): {
  nodes: Node<ServiceMapNodeData>[];
  edges: Edge<ServiceMapEdgeData>[];
} {
  const nodes: Node<ServiceMapNodeData>[] = [];
  const edges: Edge<ServiceMapEdgeData>[] = [];
  const bidirectionalPairs = new Set<string>();

  // First pass: identify bidirectional edges
  const edgeMap = new Map<string, boolean>();
  elements.forEach((el) => {
    if ('source' in (el.data || {})) {
      const edgeData = el.data as { source: string; target: string };
      const key = `${edgeData.source}->${edgeData.target}`;
      const reverseKey = `${edgeData.target}->${edgeData.source}`;
      if (edgeMap.has(reverseKey)) {
        bidirectionalPairs.add(key);
        bidirectionalPairs.add(reverseKey);
      }
      edgeMap.set(key, true);
    }
  });

  elements.forEach((el) => {
    if ('source' in (el.data || {})) {
      // It's an edge
      const edgeData = el.data as {
        source: string;
        target: string;
        id?: string;
        bidirectional?: boolean;
        isInverseEdge?: boolean;
      };

      // Skip inverse edges (they're duplicates for bidirectional display)
      if (edgeData.isInverseEdge) return;

      const edgeKey = `${edgeData.source}->${edgeData.target}`;
      const isBidirectional = edgeData.bidirectional || bidirectionalPairs.has(edgeKey);

      const markerEnd: EdgeMarker = {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: defaultColor,
      };

      edges.push({
        id: edgeData.id || `${edgeData.source}-${edgeData.target}`,
        source: edgeData.source,
        target: edgeData.target,
        type: 'default',
        style: { stroke: defaultColor, strokeWidth: 1 },
        markerEnd,
        markerStart: isBidirectional
          ? { type: MarkerType.ArrowClosed, width: 20, height: 20, color: defaultColor }
          : undefined,
        data: { isBidirectional },
      });
    } else {
      // It's a node
      const nodeData = el.data as {
        id: string;
        'service.name'?: string;
        'agent.name'?: string;
        'span.type'?: string;
        'span.subtype'?: string;
        'span.destination.service.resource'?: string;
        label?: string;
        serviceAnomalyStats?: {
          healthStatus?: ServiceHealthStatus;
        };
      };

      const isService = !!nodeData['service.name'];
      const label =
        nodeData['service.name'] ||
        nodeData.label ||
        nodeData['span.destination.service.resource'] ||
        nodeData.id;

      nodes.push({
        id: nodeData.id,
        type: isService ? 'service' : 'dependency',
        position: { x: 0, y: 0 },
        data: {
          id: nodeData.id,
          label,
          agentName: nodeData['agent.name'],
          spanType: nodeData['span.type'],
          spanSubtype: nodeData['span.subtype'],
          serviceAnomalyStats: nodeData.serviceAnomalyStats,
          isService,
        },
      });
    }
  });

  return { nodes, edges };
}
