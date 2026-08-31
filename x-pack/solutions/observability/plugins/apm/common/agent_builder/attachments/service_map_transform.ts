/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Transforms the `observability.service-map` attachment payload (topology
 * connections produced by the `observability.get_service_topology` tool) into
 * the typed React Flow nodes/edges consumed by the shared service map
 * components (`ContextualServiceMapGraph`, popovers, service flyout).
 *
 * NOT exported from the attachments barrel (`./index.ts`): that barrel is
 * imported by server-side code and `createEdgeMarker` pulls `@xyflow/react`
 * at runtime. Import this file directly from browser code and tests.
 */

import type {
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServiceMapEdge,
  ServiceMapNode,
} from '@kbn/apm-types';
import type { AgentName } from '@kbn/apm-types';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../../es_fields/apm';
import { DEFAULT_EDGE_STYLE } from '../../service_map/constants';
import { groupResourceNodes } from '../../service_map/group_resource_nodes';
import { createEdgeMarker } from '../../service_map/utils';
import type { ServiceMapAttachmentData } from './service_map';

type TopologyConnection = ServiceMapAttachmentData['connections'][number];
type TopologyNode = TopologyConnection['source'];
type TopologyServiceNode = Extract<TopologyNode, { 'service.name': string }>;
type TopologyExternalNode = Exclude<TopologyNode, TopologyServiceNode>;

function isTopologyServiceNode(node: TopologyNode): node is TopologyServiceNode {
  return SERVICE_NAME in node;
}

/**
 * Node id conventions match the APM service map: services are keyed by
 * `service.name`, external dependencies by `>` + destination resource.
 */
export function getTopologyNodeId(node: TopologyNode): string {
  return isTopologyServiceNode(node)
    ? node[SERVICE_NAME]
    : `>${node[SPAN_DESTINATION_SERVICE_RESOURCE]}`;
}

function toServiceConnectionNode(node: TopologyServiceNode): ServiceConnectionNode {
  return {
    id: getTopologyNodeId(node),
    [SERVICE_NAME]: node[SERVICE_NAME],
    // Required by `ServicesResponse`; empty values degrade gracefully in the
    // popover/flyout the same way an unknown agent does on the full map.
    [AGENT_NAME]: node[AGENT_NAME] ?? '',
    [SERVICE_ENVIRONMENT]: null,
  };
}

function toExternalConnectionNode(node: TopologyExternalNode): ExternalConnectionNode {
  return {
    id: getTopologyNodeId(node),
    [SPAN_DESTINATION_SERVICE_RESOURCE]: node[SPAN_DESTINATION_SERVICE_RESOURCE],
    [SPAN_TYPE]: node[SPAN_TYPE] ?? '',
    [SPAN_SUBTYPE]: node[SPAN_SUBTYPE] ?? '',
  };
}

function toConnectionNode(node: TopologyNode): ConnectionNode {
  return isTopologyServiceNode(node)
    ? toServiceConnectionNode(node)
    : toExternalConnectionNode(node);
}

function toReactFlowNode(
  node: TopologyNode,
  nodeMetadata: ServiceMapAttachmentData['nodeMetadata']
): ServiceMapNode {
  const id = getTopologyNodeId(node);

  if (isTopologyServiceNode(node)) {
    const metadata = nodeMetadata?.[node[SERVICE_NAME]];
    return {
      id,
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        id,
        label: node[SERVICE_NAME],
        isService: true,
        agentName: node[AGENT_NAME] as AgentName | undefined,
        alertsCount: metadata?.alertsCount,
        sloStatus: metadata?.sloStatus,
        sloCount: metadata?.sloCount,
      },
    };
  }

  return {
    id,
    type: 'dependency',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: node[SPAN_DESTINATION_SERVICE_RESOURCE],
      isService: false,
      spanType: node[SPAN_TYPE],
      spanSubtype: node[SPAN_SUBTYPE],
    },
  };
}

export interface TopologyServiceMap {
  nodes: ServiceMapNode[];
  edges: ServiceMapEdge[];
}

/**
 * Builds service map nodes/edges from attachment connections, merging
 * per-service badge metadata, collapsing A→B/B→A pairs into a single
 * bidirectional edge, and grouping external resource nodes the same way the
 * full service map does.
 */
export function transformTopologyToServiceMap({
  connections,
  nodeMetadata,
}: Pick<ServiceMapAttachmentData, 'connections' | 'nodeMetadata'>): TopologyServiceMap {
  const nodesById = new Map<string, ServiceMapNode>();
  const edgesById = new Map<string, ServiceMapEdge>();

  for (const connection of connections) {
    for (const topologyNode of [connection.source, connection.target]) {
      const id = getTopologyNodeId(topologyNode);
      if (!nodesById.has(id)) {
        nodesById.set(id, toReactFlowNode(topologyNode, nodeMetadata));
      }
    }

    const sourceId = getTopologyNodeId(connection.source);
    const targetId = getTopologyNodeId(connection.target);
    if (sourceId === targetId) {
      continue;
    }

    const edgeId = `${sourceId}~${targetId}`;
    if (edgesById.has(edgeId)) {
      continue;
    }

    const inverse = edgesById.get(`${targetId}~${sourceId}`);
    if (inverse) {
      inverse.markerStart = createEdgeMarker();
      inverse.data!.isBidirectional = true;
      continue;
    }

    edgesById.set(edgeId, {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: 'default' as const,
      style: DEFAULT_EDGE_STYLE,
      markerEnd: createEdgeMarker(),
      data: {
        isBidirectional: false,
        // Populated so the edge popover can fetch dependency stats
        // (`GET /internal/apm/service-map/dependency`).
        sourceData: toConnectionNode(connection.source),
        targetData: toConnectionNode(connection.target),
        // Not rendered by the edge component today; kept for a future
        // edge-label follow-up so the tool's RED metrics aren't lost.
        metrics: connection.metrics,
      },
    });
  }

  const grouped = groupResourceNodes([...nodesById.values()], [...edgesById.values()]);

  return { nodes: grouped.nodes, edges: grouped.edges };
}
