/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableActionsColumnType } from '@elastic/eui';

import type { SignificantItem, SignificantItemGroupItem } from '@kbn/ml-agg-utils';

export type GroupTableItemGroup = Pick<
  SignificantItemGroupItem,
  'key' | 'type' | 'fieldName' | 'fieldValue' | 'docCount' | 'pValue' | 'duplicate'
>;

export interface GroupTableItem {
  id: string;
  docCount: number;
  pValue: number | null;
  uniqueItemsCount: number;
  groupItemsSortedByUniqueness: GroupTableItemGroup[];
  histogram: SignificantItem['histogram'];
}

export type TableItemAction = EuiTableActionsColumnType<
  SignificantItem | GroupTableItem
>['actions'][number];
