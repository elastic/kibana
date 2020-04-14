/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SearchResponse } from 'elasticsearch';

import { EuiDataGridSorting } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/common';

import { Dictionary } from '../../../../common/types/common';
import { formatHumanReadableDateTimeSeconds } from '../../../../common/utils/date_utils';
import { getNestedProperty } from '../../../../common/utils/object_utils';

import { getErrorMessage } from '../../../shared_imports';

import {
  isDefaultQuery,
  matchAllQuery,
  EsDocSource,
  EsFieldName,
  PivotQuery,
  INIT_MAX_COLUMNS,
} from '../../common';
import { SearchItems } from '../../hooks/use_search_items';
import { useApi } from '../../hooks/use_api';

import {
  IndexPagination,
  OnChangeItemsPerPage,
  OnChangePage,
  OnSort,
  RenderCellValue,
  UseIndexDataReturnType,
  INDEX_STATUS,
} from './types';

type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

type IndexSearchResponse = SearchResponse7;

const defaultPagination: IndexPagination = { pageIndex: 0, pageSize: 5 };

export const useIndexData = (
  indexPattern: SearchItems['indexPattern'],
  query: PivotQuery
): UseIndexDataReturnType => {
  const [errorMessage, setErrorMessage] = useState('');
  const [status, setStatus] = useState(INDEX_STATUS.UNUSED);
  const [pagination, setPagination] = useState(defaultPagination);
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);
  const [rowCount, setRowCount] = useState(0);
  const [tableItems, setTableItems] = useState<EsDocSource[]>([]);
  const api = useApi();

  useEffect(() => {
    setPagination(defaultPagination);
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  const getIndexData = async function() {
    setErrorMessage('');
    setStatus(INDEX_STATUS.LOADING);

    const sort: EsSorting = sortingColumns.reduce((s, column) => {
      s[column.id] = { order: column.direction };
      return s;
    }, {} as EsSorting);

    const esSearchRequest = {
      index: indexPattern.title,
      body: {
        // Instead of using the default query (`*`), fall back to a more efficient `match_all` query.
        query: isDefaultQuery(query) ? matchAllQuery : query,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
      },
    };

    try {
      const resp: IndexSearchResponse = await api.esSearch(esSearchRequest);

      const docs = resp.hits.hits.map(d => d._source);

      setRowCount(resp.hits.total.value);
      setTableItems(docs);
      setStatus(INDEX_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    getIndexData();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern.title, JSON.stringify([query, pagination, sortingColumns])]);

  const allFields = indexPattern.fields.map(f => f.name);
  const indexPatternFields: string[] = allFields.filter(f => {
    if (indexPattern.metaFields.includes(f)) {
      return false;
    }

    const fieldParts = f.split('.');
    const lastPart = fieldParts.pop();
    if (lastPart === 'keyword' && allFields.includes(fieldParts.join('.'))) {
      return false;
    }

    return true;
  });

  // EuiDataGrid State
  const columns = [
    ...indexPatternFields.map(id => {
      const field = indexPattern.fields.getByName(id);

      // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
      // To fall back to the default string schema it needs to be undefined.
      let schema;

      switch (field?.type) {
        case KBN_FIELD_TYPES.BOOLEAN:
          schema = 'boolean';
          break;
        case KBN_FIELD_TYPES.DATE:
          schema = 'datetime';
          break;
        case KBN_FIELD_TYPES.GEO_POINT:
        case KBN_FIELD_TYPES.GEO_SHAPE:
          schema = 'json';
          break;
        case KBN_FIELD_TYPES.NUMBER:
          schema = 'numeric';
          break;
      }

      return { id, schema };
    }),
  ];

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<EsFieldName[]>([]);

  const defaultVisibleColumns = indexPatternFields.splice(0, INIT_MAX_COLUMNS);

  useEffect(() => {
    setVisibleColumns(defaultVisibleColumns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVisibleColumns.join()]);

  const [invalidSortingColumnns, setInvalidSortingColumnns] = useState<string[]>([]);

  const onSort: OnSort = useCallback(
    sc => {
      // Check if an unsupported column type for sorting was selected.
      const updatedInvalidSortingColumnns = sc.reduce<string[]>((arr, current) => {
        const columnType = columns.find(dgc => dgc.id === current.id);
        if (columnType?.schema === 'json') {
          arr.push(current.id);
        }
        return arr;
      }, []);
      setInvalidSortingColumnns(updatedInvalidSortingColumnns);
      if (updatedInvalidSortingColumnns.length === 0) {
        setSortingColumns(sc);
      }
    },
    [columns]
  );

  const onChangeItemsPerPage: OnChangeItemsPerPage = useCallback(
    pageSize => {
      setPagination(p => {
        const pageIndex = Math.floor((p.pageSize * p.pageIndex) / pageSize);
        return { pageIndex, pageSize };
      });
    },
    [setPagination]
  );

  const onChangePage: OnChangePage = useCallback(
    pageIndex => setPagination(p => ({ ...p, pageIndex })),
    [setPagination]
  );

  const renderCellValue: RenderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const cellValue = tableItems.hasOwnProperty(adjustedRowIndex)
        ? getNestedProperty(tableItems[adjustedRowIndex], columnId, null)
        : null;

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      const field = indexPattern.fields.getByName(columnId);
      if (field?.type === KBN_FIELD_TYPES.DATE) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (field?.type === KBN_FIELD_TYPES.BOOLEAN) {
        return cellValue ? 'true' : 'false';
      }

      return cellValue;
    };
  }, [indexPattern.fields, pagination.pageIndex, pagination.pageSize, tableItems]);

  return {
    columns,
    errorMessage,
    invalidSortingColumnns,
    onChangeItemsPerPage,
    onChangePage,
    onSort,
    noDataMessage: '',
    pagination,
    setPagination,
    setVisibleColumns,
    renderCellValue,
    rowCount,
    sortingColumns,
    status,
    tableItems,
    visibleColumns,
  };
};
