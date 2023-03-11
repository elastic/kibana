/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqWith, isEqual } from 'lodash';

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

import type { SignificantTermDuplicateGroup } from '../../../common/types';

export function getGroupsWithReaddedDuplicates(
  groups: SignificantTermGroup[],
  groupedSignificantTerms: SignificantTermDuplicateGroup[]
): SignificantTermGroup[] {
  return groups.map((g) => {
    const group = [...g.group];

    for (const groupItem of g.group) {
      const { duplicate } = groupItem;
      const duplicates = groupedSignificantTerms.find((d) =>
        d.group.some(
          (dg) => dg.fieldName === groupItem.fieldName && dg.fieldValue === groupItem.fieldValue
        )
      );

      if (duplicates !== undefined) {
        group.push(
          ...duplicates.group.map((d) => {
            return {
              fieldName: d.fieldName,
              fieldValue: d.fieldValue,
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
