/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import type {
  EdgeDataModel,
  NodeDataModel,
  EntityNodeDataModel,
  LabelNodeDataModel,
  GroupNodeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import type { Writable } from '@kbn/utility-types';
import { BoolQuery } from '@kbn/es-query';
import type { GraphContextServices, GraphContext } from './types';

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

interface LabelEdges {
  source: string;
  target: string;
}

export const getGraph = async (
  services: GraphContextServices,
  query: {
    esQuery?: { bool: BoolQuery };
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
  const { esQuery, eventIds, spaceId = 'default', start, end } = query;

  logger.trace(`Fetching graph for [eventIds: ${eventIds.join(', ')}] in [spaceId: ${spaceId}]`);

  const results = await fetchGraph({ esClient, logger, start, end, eventIds, esQuery });

  // Convert results into set of nodes and edges
  const graphContext = parseRecords(logger, results.records);

  return { nodes: graphContext.nodes, edges: graphContext.edges };
};

interface ParseContext {
  nodesMap: Record<string, NodeDataModel>;
  edgesMap: Record<string, EdgeDataModel>;
  edgeLabelsNodes: Record<string, string[]>;
  labelEdges: Record<string, LabelEdges>;
}

const parseRecords = (logger: Logger, records: GraphEdge[]): GraphContext => {
  const ctx: ParseContext = { nodesMap: {}, edgeLabelsNodes: {}, edgesMap: {}, labelEdges: {} };

  logger.trace(`Parsing records [length: ${records.length}]`);

  createNodes(logger, records, ctx);
  createEdgesAndGroups(logger, ctx);

  logger.trace(
    `Parsed [nodes: ${Object.keys(ctx.nodesMap).length}, edges: ${
      Object.keys(ctx.edgesMap).length
    }]`
  );

  // Sort groups to be first (fixes minor layout issue)
  const nodes = sortNodes(ctx.nodesMap);

  return { nodes, edges: Object.values(ctx.edgesMap) };
};

const fetchGraph = async ({
  esClient,
  logger,
  start,
  end,
  esQuery,
  eventIds,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  esQuery?: { bool: BoolQuery };
  eventIds: string[];
}): Promise<EsqlToRecords<GraphEdge>> => {
  const query = `from logs-*
| WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
| EVAL isAlert = ${
    eventIds.length > 0
      ? `event.id in (${eventIds.map((_id, idx) => `?al_id${idx}`).join(', ')})`
      : 'false'
  }
| STATS badge = COUNT(*),
  ips = VALUES(related.ip),
  // hosts = VALUES(related.hosts),
  users = VALUES(related.user)
    by actorIds = actor.entity.id,
      action = event.action,
      targetIds = target.entity.id,
      eventOutcome = event.outcome,
      isAlert
| LIMIT 1000`;

  logger.trace(`Executing query [${query}]`);
  logger.trace(JSON.stringify(buildDslFilter(eventIds, start, end, esQuery)));

  return await esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter: buildDslFilter(eventIds, start, end, esQuery),
      query,
      // @ts-ignore - types are not up to date
      params: [...eventIds.map((id, idx) => ({ [`al_id${idx}`]: id }))],
    })
    .toRecords<GraphEdge>();
};

const buildDslFilter = (
  eventIds: string[],
  start: string | number,
  end: string | number,
  esQuery?: { bool: BoolQuery }
) => ({
  bool: {
    filter: [
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
            ...(esQuery?.bool.filter.length ||
            esQuery?.bool.must.length ||
            esQuery?.bool.should.length ||
            esQuery?.bool.must_not.length
              ? [esQuery]
              : []),
            {
              terms: {
                'event.id': eventIds,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

const createNodes = (
  logger: Logger,
  records: GraphEdge[],
  context: Omit<ParseContext, 'edgesMap'>
) => {
  const { nodesMap, edgeLabelsNodes, labelEdges } = context;

  for (const record of records) {
    const { ips, hosts, users, actorIds, action, targetIds, isAlert, eventOutcome } = record;
    const actorIdsArray = castArray(actorIds);
    const targetIdsArray = castArray(targetIds);
    const unknownTargets: string[] = [];

    // Ensure all targets has an id (target can return null from the query)
    targetIdsArray.forEach((id, idx) => {
      if (!id) {
        targetIdsArray[idx] = `unknown ${uuidv4()}`;
        unknownTargets.push(targetIdsArray[idx]);
      }
    });

    logger.trace(
      `Parsing record [actorIds: ${actorIdsArray.join(
        ', '
      )}, action: ${action}, targetIds: ${targetIdsArray.join(', ')}]`
    );

    // Create entity nodes
    [...actorIdsArray, ...targetIdsArray].forEach((id) => {
      if (nodesMap[id] === undefined) {
        nodesMap[id] = {
          id,
          label: unknownTargets.includes(id) ? 'Unknown' : undefined,
          color: isAlert ? 'danger' : 'primary',
          ...determineEntityNodeShape(id, ips ?? [], hosts ?? [], users ?? []),
        };

        logger.trace(`Creating entity node [${id}]`);
      }
    });

    // Create label nodes
    for (const actorId of actorIdsArray) {
      for (const targetId of targetIdsArray) {
        const edgeId = `a(${actorId})-b(${targetId})`;

        if (edgeLabelsNodes[edgeId] === undefined) {
          edgeLabelsNodes[edgeId] = [];
        }

        const labelNode: LabelNodeDataModel = {
          id: edgeId + `label(${action})outcome(${eventOutcome})`,
          label: action,
          color: isAlert ? 'danger' : eventOutcome === 'failed' ? 'warning' : 'primary',
          shape: 'label',
        };

        logger.trace(`Creating label node [${labelNode.id}]`);

        nodesMap[labelNode.id] = labelNode;
        edgeLabelsNodes[edgeId].push(labelNode.id);
        labelEdges[labelNode.id] = { source: actorId, target: targetId };
      }
    }
  }
};

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

const sortNodes = (nodesMap: Record<string, NodeDataModel>) => {
  const groupNodes = [];
  const otherNodes = [];

  for (const node of Object.values(nodesMap)) {
    if (node.shape === 'group') {
      groupNodes.push(node);
    } else {
      otherNodes.push(node);
    }
  }

  return [...groupNodes, ...otherNodes];
};

const createEdgesAndGroups = (logger: Logger, context: ParseContext) => {
  const { edgeLabelsNodes, edgesMap, nodesMap, labelEdges } = context;

  Object.entries(edgeLabelsNodes).forEach(([edgeId, edgeLabelsIds]) => {
    // When there's more than one edge label, create a group node
    if (edgeLabelsIds.length === 1) {
      const edgeLabelId = edgeLabelsIds[0];

      connectEntitiesAndLabelNode(
        logger,
        edgesMap,
        nodesMap,
        labelEdges[edgeLabelId].source,
        edgeLabelId,
        labelEdges[edgeLabelId].target
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
        labelEdges[edgeLabelsIds[0]].source,
        groupNode.id,
        labelEdges[edgeLabelsIds[0]].target
      );

      edgeLabelsIds.forEach((edgeLabelId) => {
        (nodesMap[edgeLabelId] as Writable<LabelNodeDataModel>).parentId = groupNode.id;
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
): EdgeDataModel => {
  const sourceNode = nodesMap[sourceNodeId];
  const targetNode = nodesMap[targetNodeId];
  const color =
    sourceNode.shape !== 'group' && targetNode.shape !== 'label'
      ? sourceNode.color
      : targetNode.shape !== 'group'
      ? targetNode.color
      : 'primary';

  return {
    id: `a(${sourceNodeId})-b(${targetNodeId})`,
    source: sourceNodeId,
    target: targetNodeId,
    color,
  };
};
