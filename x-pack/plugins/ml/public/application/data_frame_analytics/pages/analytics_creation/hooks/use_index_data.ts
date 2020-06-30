/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import { CoreSetup } from 'src/core/public';

import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';
import {
  fetchChartsData,
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  EsSorting,
  SearchResponse7,
  UseIndexDataReturnType,
} from '../../../../components/data_grid';
import { getErrorMessage } from '../../../../../../common/util/errors';
import { INDEX_STATUS } from '../../../common/analytics';
import { ml } from '../../../../services/ml_api_service';

type IndexSearchResponse = SearchResponse7;

export const useIndexData = (
  indexPattern: IndexPattern,
  query: any,
  toastNotifications: CoreSetup['notifications']['toasts']
): UseIndexDataReturnType => {
  const indexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);

  // EuiDataGrid State
  const columns: EuiDataGridColumn[] = [
    ...indexPatternFields.map((id) => {
      const field = indexPattern.fields.getByName(id);
      const schema = getDataGridSchemaFromKibanaFieldType(field);
      return { id, schema, isExpandable: schema !== 'boolean' };
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

  const getIndexData = async function () {
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
        query, // isDefaultQuery(query) ? matchAllQuery : query,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
      },
    };

    try {
      const resp: IndexSearchResponse = await ml.esSearch(esSearchRequest);

      const docs = resp.hits.hits.map((d) => d._source);

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

  const fetchColumnChartsData = async function () {
    try {
      const columnChartsData = await fetchChartsData(
        indexPattern.title,
        ml.esSearch,
        query,
        columns.filter((cT) => dataGrid.visibleColumns.includes(cT.id))
      );
      dataGrid.setColumnCharts(columnChartsData);
    } catch (e) {
      showDataGridColumnChartErrorMessageToast(e, toastNotifications);
    }
  };

  useEffect(() => {
    if (dataGrid.chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataGrid.chartsVisible,
    indexPattern.title,
    JSON.stringify([query, dataGrid.visibleColumns]),
  ]);

  const renderCellValue = useRenderCellValue(indexPattern, pagination, tableItems);

  return {
    ...dataGrid,
    renderCellValue,
  };
};
