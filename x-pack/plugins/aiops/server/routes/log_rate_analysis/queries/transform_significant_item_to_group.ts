/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from '@kbn/ml-string-hash';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';
import type { SignificantItemDuplicateGroup } from '@kbn/aiops-utils/log_rate_analysis/types';

export function transformSignificantItemToGroup(
  significantItem: SignificantItem,
  groupedSignificantItems: SignificantItemDuplicateGroup[]
): SignificantItemGroup {
  const { key, type, fieldName, fieldValue, doc_count: docCount, pValue } = significantItem;

  const duplicates = groupedSignificantItems.find((d) =>
    d.group.some((dg) => dg.fieldName === fieldName && dg.fieldValue === fieldValue)
  );

  if (duplicates !== undefined) {
    return {
      id: `${stringHash(
        JSON.stringify(
          duplicates.group.map((d) => ({
            fieldName: d.fieldName,
            fieldValue: d.fieldValue,
          }))
        )
      )}`,
      group: duplicates.group.map((d) => ({
        key: d.key,
        type: d.type,
        fieldName: d.fieldName,
        fieldValue: d.fieldValue,
        duplicate: 1,
        docCount,
        pValue,
      })),
      docCount,
      pValue,
    };
  } else {
    return {
      id: `${stringHash(JSON.stringify({ fieldName, fieldValue }))}`,
      group: [
        {
          key,
          type,
          fieldName,
          fieldValue,
          duplicate: 1,
          docCount,
          pValue,
        },
      ],
      docCount,
      pValue,
    };
  }
}
