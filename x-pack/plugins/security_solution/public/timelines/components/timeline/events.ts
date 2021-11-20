/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ColumnId } from './body/column_id';
import { DataProvider, QueryOperator } from './data_providers/data_provider';
export type {
  OnColumnSorted,
  OnColumnsSorted,
  OnColumnRemoved,
  OnColumnResized,
  OnChangePage,
  OnPinEvent,
  OnRowSelected,
  OnSelectAll,
  OnUnPinEvent,
  OnUpdateColumns,
} from '../../../../common/types/timeline';

export type OnDataProviderEdited = ({
  andProviderId,
  excluded,
  field,
  id,
  operator,
  providerId,
  value,
  type,
}: {
  andProviderId?: string;
  excluded: boolean;
  field: string;
  id: string;
  operator: QueryOperator;
  providerId: string;
  value: string | number;
  type: DataProvider['type'];
}) => void;

/** Invoked when a user selects a new minimap time range */
export type OnRangeSelected = (range: string) => void;

/** Invoked when a user updates a column's filter */
export type OnFilterChange = (filter: { columnId: ColumnId; filter: string }) => void;
