/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ColumnarViewModel } from '@elastic/charts';
import { memoize, sumBy } from 'lodash';
import { parseToRgb, lighten } from 'polished';
import seedrandom from 'seedrandom';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { CriticalPathResponse } from '../../../../server/routes/traces/get_aggregated_critical_path';

interface Node {
  nodeId: string;
  children: Node[];
  countInclusive: number;
  countExclusive: number;
}

const lightenColor = lighten(0.2);

export function criticalPathToFlamegraph(
  params: {
    criticalPath: CriticalPathResponse;
    colors: string[];
  } & ({ serviceName: string; transactionName: string } | {})
): {
  viewModel: ColumnarViewModel;
  operationId: string[];
  countInclusive: Float64Array;
  sum: number;
} {
  let sum = 0;

  const { criticalPath, colors } = params;

  const totalSize = Object.keys(criticalPath.nodes).length + 1;

  const operationId = new Array<string>(totalSize);
  const countInclusive = new Float64Array(totalSize);
  const countExclusive = new Float64Array(totalSize);
  const label = new Array<string>(totalSize);
  const position = new Float32Array(totalSize * 2);
  const size = new Float32Array(totalSize);
  const color = new Float32Array(totalSize * 4);

  // eslint-disable-next-line guard-for-in
  for (const nodeId in criticalPath.timeByNodeId) {
    const count = criticalPath.timeByNodeId[nodeId];
    sum += count;
  }

  let maxDepth = 20; // min max depth
  let maxValue = 0;

  function getRootNodesFromFilters({
    serviceName,
    transactionName,
  }: {
    serviceName: string;
    transactionName: string;
  }): Node[] {
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

  function getNode(nodeId: string, depth: number): Node {
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

  let index = 0;

  const availableColors: Array<[number, number, number, number]> = colors.map(
    (vizColor) => {
      const rgb = parseToRgb(lightenColor(vizColor));

      return [rgb.red / 255, rgb.green / 255, rgb.blue / 255, 1];
    }
  );

  const pickColor = memoize((identifier: string) => {
    const idx =
      Math.abs(seedrandom(identifier).int32()) % availableColors.length;
    return availableColors[idx];
  });

  function addNodeToFlamegraph(node: Node, x: number, y: number) {
    let nodeOperationId: string;
    let nodeLabel: string;
    let operationMetadata: CriticalPathResponse['metadata'][string] | undefined;
    if (node.nodeId === 'root') {
      nodeOperationId = '';
      nodeLabel = 'root';
    } else {
      nodeOperationId = criticalPath.operationIdByNodeId[node.nodeId];
      operationMetadata = criticalPath.metadata[nodeOperationId];
      nodeLabel =
        operationMetadata['processor.event'] === 'transaction'
          ? operationMetadata['transaction.name']
          : operationMetadata['span.name'];
    }

    operationId[index] = nodeOperationId;
    countInclusive[index] = node.countInclusive;
    countExclusive[index] = node.countExclusive;
    label[index] = nodeLabel;
    position[index * 2] = x / maxValue;
    position[index * 2 + 1] = 1 - (y + 1) / (maxDepth + 1);
    size[index] = node.countInclusive / maxValue;

    const identifier =
      operationMetadata?.['processor.event'] === 'transaction'
        ? operationMetadata['transaction.type']
        : operationMetadata?.['span.subtype'] ||
          operationMetadata?.['span.type'] ||
          '';

    color.set(pickColor(identifier), index * 4);

    index++;

    let childX = x;
    node.children.forEach((child) => {
      addNodeToFlamegraph(child, childX, y + 1);
      childX += child.countInclusive;
    });
  }

  const rootNodes =
    'serviceName' in params && 'transactionName' in params
      ? getRootNodesFromFilters({
          serviceName: params.serviceName,
          transactionName: params.transactionName,
        })
      : criticalPath.rootNodes.map((nodeId) => getNode(nodeId, 1));

  const root: Node = {
    children: rootNodes,
    nodeId: 'root',
    countExclusive: 0,
    countInclusive: sumBy(rootNodes, 'countInclusive'),
  };

  maxValue = root.countInclusive;

  addNodeToFlamegraph(root, 0, 0);

  return {
    viewModel: {
      value: countInclusive,
      label,
      color,
      position0: position,
      position1: position,
      size0: size,
      size1: size,
    },
    operationId,
    countInclusive,
    sum,
  };
}
