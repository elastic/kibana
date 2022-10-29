/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sumBy } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CriticalPathResponse } from '../../server/routes/traces/get_aggregated_critical_path';

export interface CriticalPathTreeNode {
  nodeId: string;
  children: CriticalPathTreeNode[];
  countInclusive: number;
  countExclusive: number;
}

export function getAggregatedCriticalPathRootNodes(
  params: {
    criticalPath: CriticalPathResponse;
  } & ({ serviceName: string; transactionName: string } | {})
): {
  rootNodes: CriticalPathTreeNode[];
  maxDepth: number;
} {
  let maxDepth = 20; // min max depth

  const { criticalPath } = params;

  function getRootNodesFromFilters({
    serviceName,
    transactionName,
  }: {
    serviceName: string;
    transactionName: string;
  }): CriticalPathTreeNode[] {
    const rootOperationIds: string[] = [];
    const rootNodeIds: string[] = [];

    Object.keys(criticalPath.metadata).forEach((opId) => {
      const metadata = criticalPath.metadata[opId];
      if (
        metadata['service.name'] === serviceName &&
        metadata['processor.event'] === ProcessorEvent.transaction &&
        metadata['transaction.name'] === transactionName
      ) {
        rootOperationIds.push(opId);
      }
    });

    Object.keys(criticalPath.operationIdByNodeId).forEach((nodeId) => {
      const opId = criticalPath.operationIdByNodeId[nodeId];
      if (rootOperationIds.includes(opId)) {
        rootNodeIds.push(nodeId);
      }
    });

    const rootNodes = rootNodeIds.map((nodeId) => getNode(nodeId, 1));

    if (rootNodes.length) {
      const totalCountInclusive = sumBy(rootNodes, 'countInclusive');
      const totalCountExclusive = sumBy(rootNodes, 'countExclusive');
      return [
        {
          ...rootNodes[0],
          children: rootNodes.flatMap((node) => node.children),
          countInclusive: totalCountInclusive,
          countExclusive: totalCountExclusive,
        },
      ];
    }
    return [];
  }

  function getNode(nodeId: string, depth: number): CriticalPathTreeNode {
    maxDepth = Math.max(maxDepth, depth);

    const children = criticalPath.nodes[nodeId].map((childNodeId) =>
      getNode(childNodeId, depth + 1)
    );
    const nodeCountExclusive = criticalPath.timeByNodeId[nodeId] || 0;
    const nodeCountInclusive =
      sumBy(children, (child) => child.countInclusive) + nodeCountExclusive;

    return {
      nodeId,
      children,
      countInclusive: nodeCountInclusive,
      countExclusive: nodeCountExclusive,
    };
  }

  const rootNodes =
    'serviceName' in params && 'transactionName' in params
      ? getRootNodesFromFilters({
          serviceName: params.serviceName,
          transactionName: params.transactionName,
        })
      : criticalPath.rootNodes.map((nodeId) => getNode(nodeId, 1));

  return {
    rootNodes,
    maxDepth,
  };
}
