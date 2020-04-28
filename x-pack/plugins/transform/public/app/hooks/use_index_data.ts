/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import {
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  getErrorMessage,
  useDataGrid,
  useRenderCellValue,
  EsSorting,
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

  const renderCellValue = useRenderCellValue(indexPattern, pagination, tableItems);

  return {
    ...dataGrid,
    columns,
    renderCellValue,
  };
};
