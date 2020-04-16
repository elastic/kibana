/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { useEffect, useMemo } from 'react';

import { KBN_FIELD_TYPES } from '../../../../../../src/plugins/data/common';

import { formatHumanReadableDateTimeSeconds } from '../../../common/utils/date_utils';
import { getNestedProperty } from '../../../common/utils/object_utils';

import {
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  getErrorMessage,
  useDataGrid,
  EsSorting,
  RenderCellValue,
  SearchResponse7,
  UseIndexDataReturnType,
  INDEX_STATUS,
} from '../../shared_imports';

import { isDefaultQuery, matchAllQuery, PivotQuery } from '../common';

import { SearchItems } from './use_search_items';
import { useApi } from './use_api';

type IndexSearchResponse = SearchResponse7;

export const useIndexData = (
  indexPattern: SearchItems['indexPattern'],
  query: PivotQuery
): UseIndexDataReturnType => {
  const api = useApi();

  const indexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);

  // EuiDataGrid State
  const columns = [
    ...indexPatternFields.map(id => {
      const field = indexPattern.fields.getByName(id);
      const schema = getDataGridSchemaFromKibanaFieldType(field);
      return { id, schema };
    }),
  ];

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    resetPagination,
    setErrorMessage,
    setRowCount,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  useEffect(() => {
    resetPagination();
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
    errorMessage: dataGrid.errorMessage,
    invalidSortingColumnns: dataGrid.invalidSortingColumnns,
    onChangeItemsPerPage: dataGrid.onChangeItemsPerPage,
    onChangePage: dataGrid.onChangePage,
    onSort: dataGrid.onSort,
    noDataMessage: '',
    pagination,
    setPagination: dataGrid.setPagination,
    setVisibleColumns: dataGrid.setVisibleColumns,
    renderCellValue,
    rowCount: dataGrid.rowCount,
    sortingColumns,
    status: dataGrid.status,
    tableItems,
    visibleColumns: dataGrid.visibleColumns,
  };
};
