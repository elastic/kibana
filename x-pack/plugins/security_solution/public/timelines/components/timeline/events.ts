/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { ColumnId } from './body/column_id';
import { SortDirection } from './body/sort';
import { DataProvider, QueryOperator } from './data_providers/data_provider';

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

/** Invoked when a column is sorted */
export type OnColumnSorted = (
  sorted: Array<{ columnId: ColumnId; sortDirection: SortDirection }>
) => void;

export type OnColumnRemoved = (columnId: ColumnId) => void;

export type OnColumnResized = ({ columnId, delta }: { columnId: ColumnId; delta: number }) => void;

/** Invoked when a user clicks to change the number items to show per page */
export type OnChangeItemsPerPage = (itemsPerPage: number) => void;

/** Invoked when a user clicks to load more item */
export type OnChangePage = (nextPage: number) => void;

/** Invoked when a user pins an event */
export type OnPinEvent = (eventId: string) => void;

/** Invoked when a user checks/un-checks a row */
export type OnRowSelected = ({
  eventIds,
  isSelected,
}: {
  eventIds: string[];
  isSelected: boolean;
}) => void;

/** Invoked when a user checks/un-checks the select all checkbox  */
export type OnSelectAll = ({ isSelected }: { isSelected: boolean }) => void;

/** Invoked when columns are updated */
export type OnUpdateColumns = (columns: ColumnHeaderOptions[]) => void;

/** Invoked when a user unpins an event */
export type OnUnPinEvent = (eventId: string) => void;
