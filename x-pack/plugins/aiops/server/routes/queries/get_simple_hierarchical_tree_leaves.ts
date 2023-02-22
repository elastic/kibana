/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointGroup } from '@kbn/ml-agg-utils';
import { stringHash } from '@kbn/ml-string-hash';

import type { SimpleHierarchicalTreeNode } from '../../../common/types';

/**
 * Get leaves from hierarchical tree.
 */
export function getSimpleHierarchicalTreeLeaves(
  tree: SimpleHierarchicalTreeNode,
  leaves: ChangePointGroup[],
  level = 1
) {
  if (tree.children.length === 0) {
    leaves.push({
      id: `${stringHash(JSON.stringify(tree.set))}`,
      group: tree.set,
      docCount: tree.docCount,
      pValue: tree.pValue,
    });
  } else {
    for (const child of tree.children) {
      const newLeaves = getSimpleHierarchicalTreeLeaves(child, [], level + 1);
      if (newLeaves.length > 0) {
        leaves.push(...newLeaves);
      }
    }
  }

  if (leaves.length === 1 && leaves[0].group.length === 0 && leaves[0].docCount === 0) {
    return [];
  }

  return leaves;
}
