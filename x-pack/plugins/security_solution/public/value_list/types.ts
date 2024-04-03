/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ListItemSchema, ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  EuiBasicTableColumn,
  Pagination,
  EuiTableSortingType,
  CriteriaWithPagination,
} from '@elastic/eui';

export type SortFields = 'updated_at' | 'updated_by';

export type OnTableChange = (params: CriteriaWithPagination<ListItemSchema>) => void;

export type Sorting = EuiTableSortingType<Pick<ListItemSchema, SortFields>>;

export interface ListItemTableProps {
  canWriteIndex: boolean;
  items: ListItemSchema[];
  pagination: Pagination;
  sorting: Sorting;
  loading: boolean;
  onChange: OnTableChange;
  isError: boolean;
  list: ListSchema;
}
export interface ValueListModalProps {
  listId: string;
  canWriteIndex: boolean;
  onCloseModal: () => void;
}

export type ListItemTableColumns = Array<EuiBasicTableColumn<ListItemSchema>>;
