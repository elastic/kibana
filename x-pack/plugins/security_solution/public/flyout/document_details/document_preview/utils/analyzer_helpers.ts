/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import { EuiToken } from '@elastic/eui';
import type { StatsNode } from '../../../../common/containers/alerts/use_alert_prevalence_from_process_tree';

/**
 * Helper function to recursively create ancestor tree nodes
 * @param statsNodes array of all statsNodes
 * @param node current node which we populate the parents for
 * @param treeNode current node in tree node form
 * @param ancestorLevel number of level of ancestor to reach
 * @param idx current level number for comparison to ancestorLevel
 * @return a node list for EuiTreeView
 */
export const getAncestorTreeNodes = (
  statsNodes: StatsNode[],
  node: StatsNode,
  treeNode: Node,
  ancestorLevel: number,
  idx: number
): Node => {
  const ancestorNode = statsNodes.find((parent) => parent.id === node.parent);

  if (idx === ancestorLevel && ancestorNode) {
    return {
      id: `ancestor`,
      label: '...',
      children: [treeNode],
      isExpanded: true,
    };
  }
  if (ancestorLevel < 0 || idx < 0 || idx >= ancestorLevel || !ancestorNode) {
    return treeNode;
  }

  const ancestorTreeNode = {
    id: ancestorNode.id,
    label: ancestorNode.name,
    children: [treeNode],
    isExpanded: true,
  };
  return getAncestorTreeNodes(statsNodes, ancestorNode, ancestorTreeNode, ancestorLevel, idx + 1);
};

/**
 * Helper function to recursively create descendant tree nodes
 * @param statsNodes array of all statsNodes
 * @param node current node which we populate the children for
 * @param childCountLimit number of children displayed, default to 3
 * @param descendantLevel number of level of descendants to reach
 * @param idx current level number for comparison to descendatLevel
 * @return a node list for EuiTreeView
 */
export const getDescendantTreeNodes = (
  statsNodes: StatsNode[],
  node: StatsNode,
  childCountLimit: number,
  descendantLevel: number,
  idx: number
): Node[] | undefined => {
  const descendantNodes = statsNodes.filter((child) => child.parent === node.id);

  if (idx === descendantLevel && descendantNodes.length > 0) {
    return [{ id: `descendant`, label: '...', isExpanded: false }];
  }

  if (
    childCountLimit < 0 ||
    descendantLevel < 0 ||
    idx < 0 ||
    idx >= descendantLevel ||
    !descendantNodes ||
    descendantNodes.length === 0
  ) {
    return undefined;
  }

  const descendantTreeNodes: Node[] = [];
  descendantNodes.forEach((descendant, i) => {
    if (i < childCountLimit) {
      descendantTreeNodes.push({
        id: descendant.id,
        label: descendant.name,
        children: getDescendantTreeNodes(
          statsNodes,
          descendant,
          childCountLimit,
          descendantLevel,
          idx + 1
        ),
        isExpanded: false,
      });
    }
    if (i === childCountLimit) {
      descendantTreeNodes.push({ id: `more-child`, label: '...' });
    }
  });
  return descendantTreeNodes;
};

/**
 * Helper function to create tree nodes based on statsNode list from resolver api
 * @param statsNodes type StatsNode[]
 * @param childCountLimit optional parameter to limit the number of children displayed, default to 3
 * @param ancestorLevel optional parameter to limit the number of level of ancestors
 * @param descendantLevel optional parameter to limit the number of level of descendants
 * @return a node list for EuiTreeView
 */
export const getTreeNodes = (
  statsNodes: StatsNode[],
  childCountLimit: number = 3,
  ancestorLevel: number = 3,
  descendantLevel: number = 3
): Node[] => {
  if (statsNodes.length === 0) {
    return [];
  }

  const node = statsNodes[0];
  const currentNode = {
    id: node.id,
    label: React.createElement('b', {}, node.name),
    children: getDescendantTreeNodes(statsNodes, node, childCountLimit, descendantLevel, 0),
    isExpanded: true,
    icon: React.createElement(EuiToken, { iconType: 'tokenConstant' }),
  };

  return [getAncestorTreeNodes(statsNodes, node, currentNode, ancestorLevel, 0)];
};
