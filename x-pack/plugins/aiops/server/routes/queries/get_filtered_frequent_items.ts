/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import type { ChangePoint } from '@kbn/ml-agg-utils';

import type { ItemsetResult } from '../../../common/types';

// The way the `frequent_items` aggregation works could return item sets that include
// field/value pairs that are not part of the original list of significant change points.
// This cleans up groups and removes those unrelated field/value pairs.
export function getFilteredFrequentItems(
  itemsets: ItemsetResult[],
  changePoints: ChangePoint[]
): ItemsetResult[] {
  return itemsets.reduce<ItemsetResult[]>((p, itemset, itemsetIndex) => {
    // Remove field/value pairs not part of the provided change points
    itemset.set = Object.entries(itemset.set).reduce<ItemsetResult['set']>(
      (set, [field, value]) => {
        if (changePoints.some((cp) => cp.fieldName === field && cp.fieldValue === value)) {
          set[field] = value;
        }
        return set;
      },
      {}
    );

    // Only assign the updated reduced set if it doesn't already match
    // an existing set. if there's a match just add an empty set
    // so it will be filtered in the last step.
    if (itemsets.some((d, dIndex) => itemsetIndex !== dIndex && isEqual(itemset.set, d.set))) {
      return p;
    }

    // Update the size attribute to match the possibly updated set
    itemset.size = Object.keys(itemset.set).length;

    p.push(itemset);

    return p;
  }, []);
}
