/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery, escapeQuotes } from '@kbn/es-query';
import { isSignificantItem, type SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

export const getTableItemAsKQL = (tableItem: GroupTableItem | SignificantItem) => {
  if (isSignificantItem(tableItem)) {
    return `${escapeKuery(tableItem.fieldName)}:"${escapeQuotes(String(tableItem.fieldValue))}"`;
  }

  return [
    ...tableItem.groupItemsSortedByUniqueness.map(
      ({ fieldName, fieldValue }) =>
        `${escapeKuery(fieldName)}:"${escapeQuotes(String(fieldValue))}"`
    ),
  ].join(' AND ');
};
