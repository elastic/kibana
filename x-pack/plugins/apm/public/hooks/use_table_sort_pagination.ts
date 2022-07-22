/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiTableSortingType,
  Pagination,
} from '@elastic/eui';
import { orderBy } from 'lodash';
import { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import uuid from 'uuid';
import { replace } from '../components/shared/links/url_helpers';

interface Sorting<T extends any[]>
  extends Omit<EuiTableSortingType<T[0]>, 'sort'> {
  sort?: {
    field: keyof T[0];
    direction?: 'asc' | 'desc';
  };
}

export interface Props<T extends any[]> {
  items: T;
  // totalItemCount is not necessary here
  pagination?: Partial<Omit<Pagination, 'totalItemCount'>>;
  sorting?: Sorting<T>;
  urlState?: boolean;
}
const PAGE_INDEX = 0;
const PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const DESC = 'desc';

export function useTableSortAndPagination<T extends any[]>(
  { items, pagination, sorting, urlState = false }: Props<T>,
  deps: any[]
): {
  onTableChange: (criteriaWithPagination: CriteriaWithPagination<T[0]>) => void;
  tableSort?: EuiTableSortingType<T[0]>;
  tablePagination: Pagination;
  tableItems: T;
  requestId: string;
} {
  const history = useHistory();

  const [tableOptions, setTableOptions] = useState<
    CriteriaWithPagination<T[0]>
  >({
    page: {
      index: pagination?.pageIndex || PAGE_INDEX,
      size: pagination?.pageSize || PAGE_SIZE,
    },
    sort: sorting?.sort
      ? {
          field: sorting.sort.field,
          direction: sorting.sort.direction || DESC,
        }
      : undefined,
  });

  const { tableItems, requestId } = useMemo(
    () => {
      return {
        tableItems: orderBy(
          items,
          tableOptions.sort?.field,
          tableOptions.sort?.direction
        ).slice(
          tableOptions.page.index * tableOptions.page.size,
          (tableOptions.page.index + 1) * tableOptions.page.size
        ) as T,
        // Generate a new id everytime the table options are changed
        requestId: uuid(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, tableOptions, ...deps]
  );

  const tablePagination: Pagination = useMemo(
    () => ({
      pageIndex: tableOptions.page.index,
      pageSize: tableOptions.page.size,
      totalItemCount: items.length,
      pageSizeOptions: pagination?.pageSizeOptions || PAGE_SIZE_OPTIONS,
      showPerPageOptions: pagination?.showPerPageOptions || false,
    }),
    [tableOptions, items, pagination]
  );

  const tableSort: EuiTableSortingType<T[0]> = useMemo(() => {
    return {
      sort: tableOptions.sort,
      allowNeutralSort: sorting?.allowNeutralSort,
      enableAllColumns: sorting?.enableAllColumns || true,
      readOnly: sorting?.readOnly,
    };
  }, [tableOptions, sorting]);

  function handleOnTableChange(newTableOptions: CriteriaWithPagination<T[0]>) {
    if (urlState) {
      replace(history, {
        query: {
          page: newTableOptions.page.index.toString(),
          pageSize: newTableOptions.page.size.toString(),
          sortField: newTableOptions.sort?.field.toString() || '',
          sortDirection: newTableOptions.sort?.direction || '',
        },
      });
    }
    setTableOptions(newTableOptions);
  }

  return {
    requestId,
    onTableChange: handleOnTableChange,
    tableSort,
    tablePagination,
    tableItems,
  };
}
