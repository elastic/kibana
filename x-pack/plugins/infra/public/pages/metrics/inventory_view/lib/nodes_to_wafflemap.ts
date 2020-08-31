/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first, last } from 'lodash';
import {
  InfraWaffleMapGroup,
  InfraWaffleMapGroupOfGroups,
  InfraWaffleMapGroupOfNodes,
  InfraWaffleMapNode,
} from '../../../../lib/lib';
import { isWaffleMapGroupWithGroups, isWaffleMapGroupWithNodes } from './type_guards';
import { SnapshotNodePath, SnapshotNode } from '../../../../../common/http_api/snapshot_api';

export function createId(path: SnapshotNodePath[]) {
  return path.map((p) => p.value).join('/');
}

function findOrCreateGroupWithNodes(
  groups: InfraWaffleMapGroup[],
  path: SnapshotNodePath[]
): InfraWaffleMapGroupOfNodes {
  const id = path.length === 0 ? '__all__' : createId(path);
  /**
   * If the group is going to be a top level group then we can just
   * look for the full id. Otherwise we need to find the parent group and
   * then look for the group in it's sub groups.
   */
  const firstPath = first(path);
  if (path.length === 2 && firstPath) {
    const parentId = firstPath.value;
    const existingParentGroup = groups.find((g) => g.id === parentId);
    if (isWaffleMapGroupWithGroups(existingParentGroup)) {
      const existingSubGroup = existingParentGroup.groups.find((g) => g.id === id);
      if (isWaffleMapGroupWithNodes(existingSubGroup)) {
        return existingSubGroup;
      }
    }
  }
  const lastPath = last(path);
  const existingGroup = groups.find((g) => g.id === id);
  if (isWaffleMapGroupWithNodes(existingGroup)) {
    return existingGroup;
  }
  return {
    id,
    name:
      id === '__all__'
        ? i18n.translate('xpack.infra.nodesToWaffleMap.groupsWithNodes.allName', {
            defaultMessage: 'All',
          })
        : (lastPath && lastPath.label) || 'Unknown Group',
    count: 0,
    width: 0,
    squareSize: 0,
    nodes: [],
  };
}

function findOrCreateGroupWithGroups(
  groups: InfraWaffleMapGroup[],
  path: SnapshotNodePath[]
): InfraWaffleMapGroupOfGroups {
  const id = path.length === 0 ? '__all__' : createId(path);
  const lastPath = last(path);
  const existingGroup = groups.find((g) => g.id === id);
  if (isWaffleMapGroupWithGroups(existingGroup)) {
    return existingGroup;
  }
  return {
    id,
    name:
      id === '__all__'
        ? i18n.translate('xpack.infra.nodesToWaffleMap.groupsWithGroups.allName', {
            defaultMessage: 'All',
          })
        : (lastPath && lastPath.label) || 'Unknown Group',
    count: 0,
    width: 0,
    squareSize: 0,
    groups: [],
  };
}

export function createWaffleMapNode(node: SnapshotNode): InfraWaffleMapNode {
  const nodePathItem = last(node.path);
  if (!nodePathItem) {
    throw new Error('There must be at least one node path item');
  }
  return {
    pathId: node.path.map((p) => p.value).join('/'),
    path: node.path,
    id: nodePathItem.value,
    ip: nodePathItem.ip,
    name: nodePathItem.label || nodePathItem.value,
    metrics: node.metrics,
  };
}

function withoutGroup(group: InfraWaffleMapGroup) {
  return (subject: InfraWaffleMapGroup) => {
    return subject.id !== group.id;
  };
}

export function nodesToWaffleMap(nodes: SnapshotNode[]): InfraWaffleMapGroup[] {
  return nodes.reduce((groups: InfraWaffleMapGroup[], node: SnapshotNode) => {
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
