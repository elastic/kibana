/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

import type { GroupTableItem, GroupTableItemGroup } from './types';

export function getGroupTableItems(
  significantTermsGroups: SignificantTermGroup[]
): GroupTableItem[] {
  const tableItems = significantTermsGroups.map(({ id, group, docCount, histogram, pValue }) => {
    const sortedGroup = sortBy(group, [(d) => d.fieldName]);
    const dedupedGroup: GroupTableItemGroup[] = [];

    sortedGroup.forEach((pair) => {
      const { fieldName, fieldValue, docCount: pairDocCount, pValue: pairPValue, duplicate } = pair;
      if ((duplicate ?? 0) <= 1) {
        dedupedGroup.push({ fieldName, fieldValue, docCount: pairDocCount, pValue: pairPValue });
      }
    });

    const groupItemsSortedByUniqueness = sortBy(group, ['duplicate', 'docCount']);
    const sortedDedupedGroup = sortBy(dedupedGroup, (d) => [-1 * (d.pValue ?? 0), d.docCount]);

    return {
      id,
      docCount,
      pValue,
      uniqueItemsCount: sortedDedupedGroup.length,
      groupItemsSortedByUniqueness,
      histogram,
    };
  });

  return tableItems;
}
