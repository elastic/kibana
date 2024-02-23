/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jLouvain, type Edge } from 'jlouvain';
import { uniqBy } from 'lodash';

import type {
  SignificantItem,
  SignificantItemGroup,
  SignificantItemGroupItem,
} from '@kbn/ml-agg-utils';

import { duplicateIdentifier } from './duplicate_identifier';
import { groupDuplicates } from './fetch_frequent_item_sets';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';
import { getMissingSignificantItems } from './get_missing_significant_items';
import { transformSignificantItemToGroup } from './transform_significant_item_to_group';
import type { ItemSet } from '../../../../common/types';

export function getSignificantItemGroups(
  itemsets: ItemSet[],
  significantItems: SignificantItem[],
  fields: string[]
): SignificantItemGroup[] {
  console.log('itemsets', itemsets);

  const nodeData: string[] = significantItems.map((d) => d.key);
  const edgeData: Edge[] = [];

  for (const itemSet of itemsets) {
    const itemNames = itemSet.set.map((d) => `${d.fieldName}:${d.fieldValue}`);
    for (const source of itemNames) {
      for (const target of itemNames) {
        edgeData.push({ source, target, weight: itemSet.size });
      }
    }
  }
  console.log('edgeData', edgeData);

  const community = jLouvain().nodes(nodeData).edges(edgeData);
  const result = community();
  console.log('result', result);

  const resultReverseRecord = Object.entries(result).reduce<
    Record<string, SignificantItemGroupItem[]>
  >((p, [itemName, groupKey]) => {
    const item = significantItems.find((d) => d.key === itemName);
    if (item !== undefined) {
      const { key, type, fieldName, fieldValue, doc_count: docCount, pValue } = item;
      const pickedItem: SignificantItemGroupItem = {
        key,
        type,
        fieldName,
        fieldValue,
        docCount,
        pValue,
      };

      if (p[groupKey] === undefined) {
        p[groupKey] = [pickedItem];
      } else {
        p[groupKey].push(pickedItem);
      }
    }
    return p;
  }, {});
  console.log('resultReverseRecord', resultReverseRecord);

  const grouped = Object.entries(resultReverseRecord).map(([id, group]) => {
    const docCount = Math.min(...group.map((d) => d.docCount));
    const pValue = Math.max(...group.map((d) => d.pValue ?? 1));
    return {
      id,
      group,
      docCount,
      pValue,
    };
  });

  // We use the grouped significant items to later repopulate
  // the `frequent_item_sets` result with the missing duplicates.
  const groupedSignificantItems = groupDuplicates(significantItems, duplicateIdentifier).filter(
    (g) => g.group.length > 1
  );

  // `frequent_item_sets` returns lots of different small groups of field/value pairs that co-occur.
  // The following steps analyse these small groups, identify overlap between these groups,
  // and then summarize them in larger groups where possible.

  // Get a tree structure based on `frequent_item_sets`.
  // const { root } = getSimpleHierarchicalTree(itemsets, false, false, significantItems, fields);

  // Each leave of the tree will be a summarized group of co-occuring field/value pairs.
  // const treeLeaves = getSimpleHierarchicalTreeLeaves(root, []);

  // To be able to display a more cleaned up results table in the UI, we identify field/value pairs
  // that occur in multiple groups. This will allow us to highlight field/value pairs that are
  // unique to a group in a better way.
  const fieldValuePairCounts = getFieldValuePairCounts(grouped);
  const significantItemGroups = getMarkedDuplicates(grouped, fieldValuePairCounts);

  // Some field/value pairs might not be part of the `frequent_item_sets` result set, for example
  // because they don't co-occur with other field/value pairs or because of the limits we set on the query.
  // In this next part we identify those missing pairs and add them as individual groups.
  const missingSignificantItems = getMissingSignificantItems(
    significantItems,
    significantItemGroups
  );

  significantItemGroups.push(
    ...missingSignificantItems.map((significantItem) =>
      transformSignificantItemToGroup(significantItem, groupedSignificantItems)
    )
  );

  console.log('significantItemGroups', significantItemGroups[0]);

  return uniqBy(significantItemGroups, 'id');
}
