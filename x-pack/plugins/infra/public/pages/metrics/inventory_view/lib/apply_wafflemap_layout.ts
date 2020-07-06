/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first, sortBy } from 'lodash';
import { isWaffleMapGroupWithGroups, isWaffleMapGroupWithNodes } from './type_guards';
import { InfraWaffleMapGroup } from '../../../../lib/lib';
import { sizeOfSquares } from './size_of_squares';

export function getColumns(n: number, w = 1, h = 1) {
  const pageRatio = w / h;
  const ratio = pageRatio > 1.2 ? 1.2 : pageRatio;
  const width = Math.ceil(Math.sqrt(n));
  return Math.ceil(width * ratio);
}

export function getTotalItems(groups: InfraWaffleMapGroup[]) {
  if (!groups) {
    return 0;
  }
  return groups.reduce((acc, group) => {
    if (isWaffleMapGroupWithGroups(group)) {
      return group.groups.reduce((total, subGroup) => subGroup.nodes.length + total, acc);
    }
    if (isWaffleMapGroupWithNodes(group)) {
      return group.nodes.length + acc;
    }
    return acc;
  }, 0);
}

export function getLargestCount(groups: InfraWaffleMapGroup[]) {
  if (!groups) {
    return 0;
  }
  return groups.reduce((total, group) => {
    if (isWaffleMapGroupWithGroups(group)) {
      return group.groups.reduce((subTotal, subGroup) => {
        if (isWaffleMapGroupWithNodes(subGroup)) {
          return subTotal > subGroup.nodes.length ? subTotal : subGroup.nodes.length;
        }
        return subTotal;
      }, total);
    }
    if (isWaffleMapGroupWithNodes(group)) {
      return total > group.nodes.length ? total : group.nodes.length;
    }
    return total;
  }, 0);
}

const getTotalItemsOfGroup = (group: InfraWaffleMapGroup): number => getTotalItems([group]);

export function applyWaffleMapLayout(
  groups: InfraWaffleMapGroup[],
  width: number,
  height: number
): InfraWaffleMapGroup[] {
  if (groups.length === 0) {
    return [];
  }
  const levels = isWaffleMapGroupWithGroups(first(groups)) ? 2 : 1;
  const totalItems = getTotalItems(groups);
  const squareSize = Math.round(sizeOfSquares(width, height, totalItems, levels));
  const largestCount = getLargestCount(groups);
  return sortBy(groups, getTotalItemsOfGroup)
    .reverse()
    .map((group) => {
      if (isWaffleMapGroupWithGroups(group)) {
        const columns = getColumns(largestCount, width, height);
        const groupOfNodes = group.groups;
        const subGroups = sortBy(groupOfNodes, getTotalItemsOfGroup)
          .reverse()
          .filter(isWaffleMapGroupWithNodes)
          .map((subGroup) => {
            return {
              ...subGroup,
              count: subGroup.nodes.length,
              columns,
              width: columns * squareSize,
              squareSize,
            };
          });
        return {
          ...group,
          groups: subGroups,
          count: getTotalItems([group]),
          squareSize,
        };
      }
      if (isWaffleMapGroupWithNodes(group)) {
        const columns = getColumns(Math.max(group.nodes.length, largestCount), width, height);
        return {
          ...group,
          count: group.nodes.length,
          squareSize,
          width: columns * squareSize,
        };
      }
      return group;
    });
}
