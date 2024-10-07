/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type {
  EdgeDataModel,
  NodeDataModel,
  EntityNodeDataModel,
  LabelNodeDataModel,
  GroupNodeDataModel,
  NodeShape,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import type { Writeable } from '@kbn/zod';
import type { GraphContextServices, GraphContext } from './types';

export const getGraph = async (
  services: GraphContextServices,
  query: {
    actorIds: string[];
    eventIds: string[];
    spaceId?: string;
    start: string | number;
    end: string | number;
  }
): Promise<{
  nodes: NodeDataModel[];
  edges: EdgeDataModel[];
}> => {
  const { esClient, logger } = services;
  const { actorIds, eventIds, spaceId = 'default', start, end } = query;

  logger.debug(
    `Fetching graph for [eventIds: ${eventIds.join(', ')}] [actorIds: ${actorIds.join(
      ', '
    )}] in [spaceId: ${spaceId}]`
  );

  const results = await fetchGraph({ esClient, logger, start, end, eventIds, actorIds });

  // Convert results into set of nodes and edges
  const graphContext = parseRecords(logger, results.records);

  return { nodes: graphContext.nodes, edges: graphContext.edges };
};

const parseRecords = (logger: Logger, records: GraphEdge[]): GraphContext => {
  const nodesMap: Record<string, NodeDataModel> = {};
  const edgeLabelsNodes: Record<string, string[]> = {};
  const edgesMap: Record<string, EdgeDataModel> = {};

  logger.trace(`Parsing records [length: ${records.length}]`);

  records.forEach(
    ({
      badge,
      ips,
      hosts,
      users,
      actorIds: maybeActorIds,
      action,
      targetIds: maybeTargetIds,
      isAlert,
      eventOutcome,
    }) => {
      const actorIds = castArray(maybeActorIds);
      const targetIds = castArray(maybeTargetIds);

      logger.trace(
        `Parsing record [actorIds: ${actorIds.join(
          ', '
        )}, action: ${action}, targetIds: ${targetIds.join(', ')}]`
      );

      // Create entity nodes
      [...actorIds, ...targetIds].forEach((id) => {
        if (nodesMap[id] === undefined) {
          nodesMap[id] = {
            id,
            label: id,
            color: isAlert ? 'danger' : 'primary',
            ...determineEntityNodeShape(id, ips ?? [], hosts ?? [], users ?? []),
          };

          logger.trace(`Creating entity node [${id}]`);
        }
      });

      // Create label nodes
      actorIds.forEach((actorId) => {
        targetIds.forEach((targetId) => {
          const edgeId = `a(${actorId})-b(${targetId})`;

          if (edgeLabelsNodes[edgeId] === undefined) {
            edgeLabelsNodes[edgeId] = [];
          }

          const labelNode = {
            id: edgeId + `label(${action})`,
            label: action,
            source: actorId,
            target: targetId,
            color: eventOutcome === 'failed' ? 'warning' : isAlert ? 'danger' : 'primary',
            shape: 'label',
          } as LabelNodeDataModel;

          logger.trace(`Creating label node [${labelNode.id}]`);

          nodesMap[labelNode.id] = labelNode;
          edgeLabelsNodes[edgeId].push(labelNode.id);
        });
      });

      Object.entries(edgeLabelsNodes).forEach(([edgeId, edgeLabelsIds]) => {
        // When there's more than one edge label, create a group node
        if (edgeLabelsIds.length === 1) {
          const edgeLabelId = edgeLabelsIds[0];

          connectEntitiesAndLabelNode(
            logger,
            edgesMap,
            nodesMap,
            (nodesMap[edgeLabelId] as LabelNodeDataModel).source,
            edgeLabelId,
            (nodesMap[edgeLabelId] as LabelNodeDataModel).target
          );
        } else {
          const groupNode: GroupNodeDataModel = {
            id: `grp(${edgeId})`,
            shape: 'group',
          };
          nodesMap[groupNode.id] = groupNode;

          connectEntitiesAndLabelNode(
            logger,
            edgesMap,
            nodesMap,
            (nodesMap[edgeLabelsIds[0]] as LabelNodeDataModel).source,
            groupNode.id,
            (nodesMap[edgeLabelsIds[0]] as LabelNodeDataModel).target
          );

          edgeLabelsIds.forEach((edgeLabelId) => {
            (nodesMap[edgeLabelId] as Writeable<LabelNodeDataModel>).parentId = groupNode.id;
            connectEntitiesAndLabelNode(
              logger,
              edgesMap,
              nodesMap,
              groupNode.id,
              edgeLabelId,
              groupNode.id
            );
          });
        }
      });
    }
  );

  logger.trace(
    `Parsed [nodes: ${Object.keys(nodesMap).length}, edges: ${Object.keys(edgesMap).length}]`
  );
  return { nodes: Object.values(nodesMap), edges: Object.values(edgesMap) };
};

const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  actorIds,
  eventIds,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  actorIds: string[];
  eventIds: string[];
}): Promise<EsqlToRecords<GraphEdge>> => {
  const query = `from logs-*
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
| EVAL isAlert = event.id in (${eventIds.map((_id, idx) => `?al_id${idx}`).join(', ')})
| STATS badge = COUNT(*),
  ips = VALUES(related.ip),
  // hosts = VALUES(related.hosts),
  users = VALUES(related.user)
    by actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      eventOutcome = event.outcome,
      isAlert`;

  logger.trace(`Executing query [${query}]`);

  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                },
              },
            },
            {
              bool: {
                should: [
                  {
                    terms: {
                      'event.id': eventIds,
                    },
                  },
                  {
                    terms: {
                      'actor.entity.id': actorIds,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      },
      query,
      // @ts-ignore - types are not up to date
      params: [...eventIds.map((id, idx) => ({ [`al_id${idx}`]: id }))],
    })
    .toRecords<GraphEdge>();
};

interface GraphEdge {
  badge: number;
  ips: string[];
  hosts: string[];
  users: string[];
  actorIds: string[] | string;
  action: string;
  targetIds: string[] | string;
  eventOutcome: string;
  isAlert: boolean;
}

const determineEntityNodeShape = (
  actorId: string,
  ips: string[],
  hosts: string[],
  users: string[]
): {
  shape: EntityNodeDataModel['shape'];
  icon: string;
} => {
  // If actor is a user return ellipse
  if (users.includes(actorId)) {
    return { shape: 'ellipse', icon: 'user' };
  }

  // If actor is a host return hexagon
  if (hosts.includes(actorId)) {
    return { shape: 'hexagon', icon: 'storage' };
  }

  // If actor is an IP return diamond
  if (ips.includes(actorId)) {
    return { shape: 'diamond', icon: 'globe' };
  }

  return { shape: 'hexagon', icon: 'questionInCircle' };
};

const connectEntitiesAndLabelNode = (
  logger: Logger,
  edgesMap: Record<string, EdgeDataModel>,
  nodesMap: Record<string, NodeDataModel>,
  sourceNodeId: string,
  labelNodeId: string,
  targetNodeId: string
) => {
  [
    connectNodes(nodesMap, sourceNodeId, labelNodeId),
    connectNodes(nodesMap, labelNodeId, targetNodeId),
  ].forEach((edge) => {
    logger.trace(`Connecting nodes [${edge.source} -> ${edge.target}]`);
    edgesMap[edge.id] = edge;
  });
};

const connectNodes = (
  nodesMap: Record<string, NodeDataModel>,
  sourceNodeId: string,
  targetNodeId: string
) => {
  return {
    id: `a(${sourceNodeId})-b(${targetNodeId})`,
    source: sourceNodeId,
    sourceShape: nodesMap[sourceNodeId].shape as NodeShape,
    target: targetNodeId,
    targetShape: nodesMap[targetNodeId].shape as NodeShape,
  } as EdgeDataModel;
};
