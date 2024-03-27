/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqWith, isEqual } from 'lodash';

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';
import type { SignificantItemDuplicateGroup } from '@kbn/aiops-utils/log_rate_analysis/types';

export function getGroupsWithReaddedDuplicates(
  groups: SignificantItemGroup[],
  groupedSignificantItems: SignificantItemDuplicateGroup[]
): SignificantItemGroup[] {
  return groups.map((g) => {
    const group = [...g.group];

    for (const groupItem of g.group) {
      const { duplicate } = groupItem;
      const duplicates = groupedSignificantItems.find((d) =>
        d.group.some(
          (dg) => dg.fieldName === groupItem.fieldName && dg.fieldValue === groupItem.fieldValue
        )
      );

      if (duplicates !== undefined) {
        group.push(
          ...duplicates.group.map((d) => {
            return {
              key: d.key,
              type: d.type,
              fieldName: d.fieldName,
              fieldValue: d.fieldValue,
              pValue: d.pValue,
              docCount: d.doc_count,
              duplicate,
            };
          })
        );
      }
    }

    return {
      ...g,
      group: uniqWith(group, (a, b) => isEqual(a, b)),
    };
  });
}
