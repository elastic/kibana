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
  ServiceMapEdgeData,
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
import { getConnectionNodeLabel } from '../../service_map/get_service_map_nodes';
import { groupResourceNodes } from '../../service_map/group_resource_nodes';
import { createEdgeMarker, getEdgeId, getExitSpanNodeId } from '../../service_map/utils';
import type { ServiceMapAttachmentData } from './service_map';

type TopologyConnection = ServiceMapAttachmentData['connections'][number];
type TopologyNode = TopologyConnection['source'];
type TopologyServiceNode = Extract<TopologyNode, { 'service.name': string }>;
type TopologyExternalNode = Exclude<TopologyNode, TopologyServiceNode>;

function isTopologyServiceNode(node: TopologyNode): node is TopologyServiceNode {
  return SERVICE_NAME in node;
}

function toServiceConnectionNode(node: TopologyServiceNode): ServiceConnectionNode {
  return {
    id: node[SERVICE_NAME],
    [SERVICE_NAME]: node[SERVICE_NAME],
    // Required by `ServicesResponse`; empty values degrade gracefully in the
    // popover/flyout the same way an unknown agent does on the full map.
    [AGENT_NAME]: node[AGENT_NAME] ?? '',
    [SERVICE_ENVIRONMENT]: null,
  };
}

function toExternalConnectionNode(node: TopologyExternalNode): ExternalConnectionNode {
  const connectionNode: ExternalConnectionNode = {
    id: '',
    [SPAN_DESTINATION_SERVICE_RESOURCE]: node[SPAN_DESTINATION_SERVICE_RESOURCE],
    [SPAN_TYPE]: node[SPAN_TYPE] ?? '',
    [SPAN_SUBTYPE]: node[SPAN_SUBTYPE] ?? '',
  };
  connectionNode.id = getExitSpanNodeId(connectionNode);
  return connectionNode;
}

function toConnectionNode(node: TopologyNode): ConnectionNode {
  return isTopologyServiceNode(node)
    ? toServiceConnectionNode(node)
    : toExternalConnectionNode(node);
}

/**
 * Node id conventions match the APM service map: services are keyed by
 * `service.name`, external dependencies by `>` + destination resource
 * (see `getExitSpanNodeId`).
 */
export function getTopologyNodeId(node: TopologyNode): string {
  return toConnectionNode(node).id;
}

function toReactFlowNode(
  connectionNode: ConnectionNode,
  node: TopologyNode,
  nodeMetadata: ServiceMapAttachmentData['nodeMetadata']
): ServiceMapNode {
  const { id } = connectionNode;

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
        // Unknown agent names degrade to the default icon in ServiceNode.
        agentName: node[AGENT_NAME] as AgentName | undefined,
        alertsCount: metadata?.alertsCount,
        sloStatus: metadata?.sloStatus,
        sloCount: metadata?.sloCount,
        // The node's anomaly badge derives severity from the score, the same
        // way the full service map does.
        serviceAnomalyStats:
          metadata?.anomalyScore !== undefined
            ? { anomalyScore: metadata.anomalyScore }
            : undefined,
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
 * Reads back the tool metrics stashed on `edge.data` by
 * {@link transformTopologyToServiceMap}. `ServiceMapEdgeData` is an open
 * record, so this is the single place the stored shape is asserted.
 */
export function getEdgeMetrics(edge: ServiceMapEdge): TopologyConnection['metrics'] {
  return edge.data?.metrics as TopologyConnection['metrics'];
}

type EdgeWithData = ServiceMapEdge & { data: ServiceMapEdgeData };

/**
 * Builds service map nodes/edges from attachment connections, merging
 * per-service badge metadata, collapsing A→B/B→A pairs into a single
 * bidirectional edge, and grouping external resource nodes the same way the
 * full service map does. Edge `data` mirrors `transformToReactFlow` output
 * (`sourceData`/`targetData`/`resources`/labels) so the edge popover can
 * fetch dependency stats (`GET /internal/apm/service-map/dependency`).
 */
export function transformTopologyToServiceMap({
  connections,
  nodeMetadata,
}: Pick<ServiceMapAttachmentData, 'connections' | 'nodeMetadata'>): TopologyServiceMap {
  const nodesById = new Map<string, ServiceMapNode>();
  const edgesById = new Map<string, EdgeWithData>();

  for (const connection of connections) {
    const sourceData = toConnectionNode(connection.source);
    const targetData = toConnectionNode(connection.target);

    for (const [connectionNode, topologyNode] of [
      [sourceData, connection.source],
      [targetData, connection.target],
    ] as const) {
      if (!nodesById.has(connectionNode.id)) {
        nodesById.set(
          connectionNode.id,
          toReactFlowNode(connectionNode, topologyNode, nodeMetadata)
        );
      }
    }

    if (sourceData.id === targetData.id) {
      continue;
    }

    const edgeId = getEdgeId(sourceData.id, targetData.id);
    if (edgesById.has(edgeId)) {
      continue;
    }

    const inverse = edgesById.get(getEdgeId(targetData.id, sourceData.id));
    if (inverse) {
      inverse.markerStart = createEdgeMarker();
      inverse.data.isBidirectional = true;
      continue;
    }

    edgesById.set(edgeId, {
      id: edgeId,
      source: sourceData.id,
      target: targetData.id,
      type: 'default' as const,
      style: DEFAULT_EDGE_STYLE,
      markerEnd: createEdgeMarker(),
      data: {
        isBidirectional: false,
        sourceData,
        targetData,
        sourceLabel: getConnectionNodeLabel(sourceData),
        targetLabel: getConnectionNodeLabel(targetData),
        // The edge popover only fetches dependency stats for exit-span
        // targets (mirrors `mapEdges` in the full service map).
        resources:
          SPAN_DESTINATION_SERVICE_RESOURCE in targetData
            ? [targetData[SPAN_DESTINATION_SERVICE_RESOURCE]]
            : [],
        // Not rendered by the edge component today; kept for a future
        // edge-label follow-up so the tool's RED metrics aren't lost.
        metrics: connection.metrics,
      },
    });
  }

  const grouped = groupResourceNodes([...nodesById.values()], [...edgesById.values()]);

  return { nodes: grouped.nodes, edges: grouped.edges };
}
