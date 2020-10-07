/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import {
  isEsSearchResponse,
  isFieldHistogramsResponseSchema,
} from '../../../common/api_schemas/type_guards';
import type { EsSorting, UseIndexDataReturnType } from '../../shared_imports';

import { getErrorMessage } from '../../../common/utils/errors';
import { isDefaultQuery, matchAllQuery, PivotQuery } from '../common';
import { SearchItems } from './use_search_items';
import { useApi } from './use_api';

import { useAppDependencies, useToastNotifications } from '../app_dependencies';

export const useIndexData = (
  indexPattern: SearchItems['indexPattern'],
  query: PivotQuery
): UseIndexDataReturnType => {
  const api = useApi();
  const toastNotifications = useToastNotifications();
  const {
    ml: {
      getFieldType,
      getDataGridSchemaFromKibanaFieldType,
      getFieldsFromKibanaIndexPattern,
      showDataGridColumnChartErrorMessageToast,
      useDataGrid,
      useRenderCellValue,
      getProcessedFields,
      INDEX_STATUS,
    },
  } = useAppDependencies();

  const indexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);

  // EuiDataGrid State
  const columns: EuiDataGridColumn[] = [
    ...indexPatternFields.map((id) => {
      const field = indexPattern.fields.getByName(id);
      const schema = getDataGridSchemaFromKibanaFieldType(field);
      return { id, schema };
    }),
  ];

  const dataGrid = useDataGrid(columns);

  const {
    chartsVisible,
    pagination,
    resetPagination,
    setColumnCharts,
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

  const fetchDataGridData = async function () {
    setErrorMessage('');
    setStatus(INDEX_STATUS.LOADING);

    const sort: EsSorting = sortingColumns.reduce((s, column) => {
      s[column.id] = { order: column.direction };
      return s;
    }, {} as EsSorting);

    const esSearchRequest = {
      index: indexPattern.title,
      body: {
        fields: ['*'],
        _source: false,
        // Instead of using the default query (`*`), fall back to a more efficient `match_all` query.
        query: isDefaultQuery(query) ? matchAllQuery : query,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
      },
    };

    const resp = await api.esSearch(esSearchRequest);

    if (!isEsSearchResponse(resp)) {
      setErrorMessage(getErrorMessage(resp));
      setStatus(INDEX_STATUS.ERROR);
      return;
    }

    const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields));

    setRowCount(resp.hits.total.value);
    setTableItems(docs);
    setStatus(INDEX_STATUS.LOADED);
  };

  const fetchColumnChartsData = async function () {
    const columnChartsData = await api.getHistogramsForFields(
      indexPattern.title,
      columns
        .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
        .map((cT) => ({
          fieldName: cT.id,
          type: getFieldType(cT.schema),
        })),
      isDefaultQuery(query) ? matchAllQuery : query
    );

    if (!isFieldHistogramsResponseSchema(columnChartsData)) {
      showDataGridColumnChartErrorMessageToast(columnChartsData, toastNotifications);
      return;
    }

    setColumnCharts(columnChartsData);
  };

  useEffect(() => {
    fetchDataGridData();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexPattern.title, JSON.stringify([query, pagination, sortingColumns])]);

  useEffect(() => {
    if (chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartsVisible, indexPattern.title, JSON.stringify([query, dataGrid.visibleColumns])]);

  const renderCellValue = useRenderCellValue(indexPattern, pagination, tableItems);

  return {
    ...dataGrid,
    renderCellValue,
  };
};
