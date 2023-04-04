/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SignificantTerm } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from './types';

export function isSignificantTerm(arg: unknown): arg is SignificantTerm {
  return isPopulatedObject(arg, ['fieldName', 'fieldValue']);
}

export const getTableItemAsKuery = (tableItem: GroupTableItem | SignificantTerm) => {
  if (isSignificantTerm(tableItem)) {
    return `${escapeKuery(tableItem.fieldName)}:${escapeKuery(String(tableItem.fieldValue))}`;
  }

  return [
    ...tableItem.groupItemsSortedByUniqueness.map(
      ({ fieldName, fieldValue }) => `${escapeKuery(fieldName)}:${escapeKuery(String(fieldValue))}`
    ),
  ].join(' AND ');
};
