/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePoint, ChangePointGroup } from '@kbn/ml-agg-utils';

import { duplicateIdentifier } from './duplicate_identifier';
import { dropDuplicates, groupDuplicates } from './fetch_frequent_items';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';
import { getFilteredFrequentItems } from './get_filtered_frequent_items';
import { getGroupsWithReaddedDuplicates } from './get_groups_with_readded_duplicates';
import { getMissingChangePoints } from './get_missing_change_points';
import { transformChangePointToGroup } from './transform_change_point_to_group';
import type { ItemsetResult } from '../../../common/types';

export function getChangePointGroups(
  itemsets: ItemsetResult[],
  changePoints: ChangePoint[],
  fields: string[]
): ChangePointGroup[] {
  // These are the deduplicated change points we pass to the `frequent_items` aggregation.
  const deduplicatedChangePoints = dropDuplicates(changePoints, duplicateIdentifier);

  // We use the grouped change points to later repopulate
  // the `frequent_items` result with the missing duplicates.
  const groupedChangePoints = groupDuplicates(changePoints, duplicateIdentifier).filter(
    (g) => g.group.length > 1
  );

  const filteredDf = getFilteredFrequentItems(itemsets, changePoints);

  // `frequent_items` returns lot of different small groups of field/value pairs that co-occur.
  // The following steps analyse these small groups, identify overlap between these groups,
  // and then summarize them in larger groups where possible.

  // Get a tree structure based on `frequent_items`.
  const { root } = getSimpleHierarchicalTree(filteredDf, true, false, fields);

  // Each leave of the tree will be a summarized group of co-occuring field/value pairs.
  const treeLeaves = getSimpleHierarchicalTreeLeaves(root, []);

  // To be able to display a more cleaned up results table in the UI, we identify field/value pairs
  // that occur in multiple groups. This will allow us to highlight field/value pairs that are
  // unique to a group in a better way. This step will also re-add duplicates we identified in the
  // beginning and didn't pass on to the `frequent_items` agg.
  const fieldValuePairCounts = getFieldValuePairCounts(treeLeaves);
  const changePointGroupsWithMarkedDuplicates = getMarkedDuplicates(
    treeLeaves,
    fieldValuePairCounts
  );
  const changePointGroups = getGroupsWithReaddedDuplicates(
    changePointGroupsWithMarkedDuplicates,
    groupedChangePoints
  );

  // Some field/value pairs might not be part of the `frequent_items` result set, for example
  // because they don't co-occur with other field/value pairs or because of the limits we set on the query.
  // In this next part we identify those missing pairs and add them as individual groups.
  const missingChangePoints = getMissingChangePoints(deduplicatedChangePoints, changePointGroups);

  changePointGroups.push(
    ...missingChangePoints.map((changePoint) =>
      transformChangePointToGroup(changePoint, groupedChangePoints)
    )
  );

  return changePointGroups;
}
