/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointGroup, FieldValuePair } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

export function getGroupTableItems(changePointsGroups: ChangePointGroup[]): GroupTableItem[] {
  const tableItems = changePointsGroups.map(({ id, group, docCount, histogram, pValue }) => {
    const sortedGroup = group.sort((a, b) =>
      a.fieldName > b.fieldName ? 1 : b.fieldName > a.fieldName ? -1 : 0
    );
    const dedupedGroup: FieldValuePair[] = [];
    const repeatedValues: FieldValuePair[] = [];

    sortedGroup.forEach((pair) => {
      const { fieldName, fieldValue } = pair;
      if (pair.duplicate === false) {
        dedupedGroup.push({ fieldName, fieldValue });
      } else {
        repeatedValues.push({ fieldName, fieldValue });
      }
    });

    return {
      id,
      docCount,
      pValue,
      group: dedupedGroup,
      repeatedValues,
      histogram,
    };
  });

  return tableItems;
}
