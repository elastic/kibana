/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, last } from 'lodash';
import { InfraNode, InfraNodePath } from '../../../common/graphql/types';
import {
  InfraWaffleMapGroup,
  InfraWaffleMapGroupOfGroups,
  InfraWaffleMapGroupOfNodes,
  InfraWaffleMapNode,
} from '../../lib/lib';
import { isWaffleMapGroupWithGroups, isWaffleMapGroupWithNodes } from './type_guards';

function createId(path: InfraNodePath[]) {
  return path.map(p => p.value).join('/');
}

function findOrCreateGroupWithNodes(
  groups: InfraWaffleMapGroup[],
  path: InfraNodePath[]
): InfraWaffleMapGroupOfNodes {
  const id = path.length === 0 ? '__all__' : createId(path);
  /**
   * If the group is going to be a top level group then we can just
   * look for the full id. Otherwise we need to find the parent group and
   * then look for the group in it's sub groups.
   */
  if (path.length === 2) {
    const parentId = first(path).value;
    const existingParentGroup = groups.find(g => g.id === parentId);
    if (isWaffleMapGroupWithGroups(existingParentGroup)) {
      const existingSubGroup = existingParentGroup.groups.find(g => g.id === id);
      if (isWaffleMapGroupWithNodes(existingSubGroup)) {
        return existingSubGroup;
      }
    }
  }
  const existingGroup = groups.find(g => g.id === id);
  if (isWaffleMapGroupWithNodes(existingGroup)) {
    return existingGroup;
  }
  return {
    id,
    name: id === '__all__' ? 'All' : last(path).value,
    count: 0,
    width: 0,
    squareSize: 0,
    nodes: [],
  };
}

function findOrCreateGroupWithGroups(
  groups: InfraWaffleMapGroup[],
  path: InfraNodePath[]
): InfraWaffleMapGroupOfGroups {
  const id = path.length === 0 ? '__all__' : createId(path);
  const existingGroup = groups.find(g => g.id === id);
  if (isWaffleMapGroupWithGroups(existingGroup)) {
    return existingGroup;
  }
  return {
    id,
    name: id === '__all__' ? 'All' : last(path).value,
    count: 0,
    width: 0,
    squareSize: 0,
    groups: [],
  };
}

function createWaffleMapNode(node: InfraNode): InfraWaffleMapNode {
  return {
    id: node.path.map(p => p.value).join('/'),
    path: node.path,
    name: last(node.path).value,
    metric: node.metric,
  };
}

function withoutGroup(group: InfraWaffleMapGroup) {
  return (subject: InfraWaffleMapGroup) => {
    return subject.id !== group.id;
  };
}

export function nodesToWaffleMap(nodes: InfraNode[]): InfraWaffleMapGroup[] {
  return nodes.reduce((groups: InfraWaffleMapGroup[], node: InfraNode) => {
    const waffleNode = createWaffleMapNode(node);
    if (node.path.length === 2) {
      const parentGroup = findOrCreateGroupWithNodes(
        groups,
        node.path.slice(0, node.path.length - 1)
      );
      parentGroup.nodes.push(waffleNode);
      return groups.filter(withoutGroup(parentGroup)).concat([parentGroup]);
    }
    if (node.path.length === 3) {
      const parentGroup = findOrCreateGroupWithNodes(
        groups,
        node.path.slice(0, node.path.length - 1)
      );
      parentGroup.nodes.push(waffleNode);
      const topGroup = findOrCreateGroupWithGroups(
        groups,
        node.path.slice(0, node.path.length - 2)
      );
      topGroup.groups = topGroup.groups.filter(withoutGroup(parentGroup)).concat([parentGroup]);
      return groups.filter(withoutGroup(topGroup)).concat([topGroup]);
    }
    const allGroup = findOrCreateGroupWithNodes(groups, []);
    allGroup.nodes.push(waffleNode);
    return groups.filter(withoutGroup(allGroup)).concat([allGroup]);
  }, []);
}
