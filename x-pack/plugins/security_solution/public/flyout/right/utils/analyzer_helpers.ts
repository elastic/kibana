/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';

/**
 * Helper function to check if a node has grandchildren
 * @param statsNodes type StatsNode array
 * @param children type StatsNode array
 * @return a boolean of wheather a bode has grandchildren
 */
export const hasGrandchildren = (statsNodes: StatsNode[], children: StatsNode[]) => {
  return children.some((child) => statsNodes.some((node) => node.parent === child.id));
};

/**
 * Helper function to create a tree node from id, name and children
 * @param id type string
 * @param name type string
 * @param children option children nodes
 * @return a node of Node type
 */
export const makeTreeNode = (id: string, name: string, children: Node[]): Node => {
  return { label: name, id, isExpanded: true, children };
};

/**
 * Helper function to create tree nodes based on statsNode list from resolver api
 * @param statsNodes type StatsNode[]
 * @param childrenCountLimit optional parameter to limit the number of children displayed, default to 5
 * @return a node list for EuiTreeView
 */

export const getTreeNodes = (statsNodes: StatsNode[], childCountLimit: number = 5): Node[] => {
  const node = statsNodes[0];
  const nodeList = [];
  const currentNode = makeTreeNode(node.id, `--> (Analyzed Event) ${node.name}`, []);

  const children = statsNodes.filter((item) => item.parent === node.id);
  if (children && children.length !== 0) {
    children.forEach((child, idx) => {
      if (idx < childCountLimit) {
        currentNode.children?.push(makeTreeNode(child.id, `--> ${child.name}`, []));
      }
    });
  }

  const parent = statsNodes.find((item) => item.id === node.parent);
  if (parent) {
    const parentNode = makeTreeNode(parent.id, `--> ${parent.name}`, [currentNode]);
    if (parent?.parent) {
      nodeList.push(makeTreeNode('grandparent', '...', [parentNode]));
    } else {
      nodeList.push(parentNode);
    }
  } else {
    nodeList.push(currentNode);
  }

  if (hasGrandchildren(statsNodes, children)) {
    nodeList.push(makeTreeNode('grandchild', '...', []));
  }

  return nodeList;
};
