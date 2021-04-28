/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import { CoreSetup } from 'src/core/public';

import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';

import { DataLoader } from '../../../../datavisualizer/index_based/data_loader';

import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  EsSorting,
  UseIndexDataReturnType,
  getProcessedFields,
} from '../../../../components/data_grid';
import type { SearchResponse7 } from '../../../../../../common/types/es_client';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { INDEX_STATUS } from '../../../common/analytics';
import { ml } from '../../../../services/ml_api_service';
import { getRuntimeFieldsMapping } from '../../../../components/data_grid/common';

type IndexSearchResponse = SearchResponse7;

export const useIndexData = (
  indexPattern: IndexPattern,
  query: Record<string, any> | undefined,
  toastNotifications: CoreSetup['notifications']['toasts']
): UseIndexDataReturnType => {
  const [indexPatternFields, setIndexPatternFields] = useState<string[]>();

  // Fetch 500 random documents to determine populated fields.
  // This is a workaround to avoid passing potentially thousands of unpopulated fields
  // (for example, as part of filebeat/metricbeat/ECS based indices)
  // to the data grid component which would significantly slow down the page.
  const fetchDataGridSampleDocuments = async function () {
    setErrorMessage('');
    setStatus(INDEX_STATUS.LOADING);

    const esSearchRequest = {
      index: indexPattern.title,
      body: {
        fields: ['*'],
        _source: false,
        query: {
          function_score: {
            query: { match_all: {} },
            random_score: {},
          },
        },
        size: 500,
      },
    };

    try {
      const resp: IndexSearchResponse = await ml.esSearch(esSearchRequest);
      const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

      // Get all field names for each returned doc and flatten it
      // to a list of unique field names used across all docs.
      const allKibanaIndexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);
      const populatedFields = [...new Set(docs.map(Object.keys).flat(1))]
        .filter((d) => allKibanaIndexPatternFields.includes(d))
        .sort();

      setStatus(INDEX_STATUS.LOADED);
      setIndexPatternFields(populatedFields);
    } catch (e) {
      setErrorMessage(extractErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    fetchDataGridSampleDocuments();
  }, []);

  // EuiDataGrid State
  const columns: EuiDataGridColumn[] = [
    ...(indexPatternFields ?? []).map((id) => {
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
    setRowCountRelation,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  useEffect(() => {
    resetPagination();
    // custom comparison
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
        query,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        fields: ['*'],
        _source: false,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
        ...getRuntimeFieldsMapping(indexPatternFields, indexPattern),
      },
    };

    try {
      const resp: IndexSearchResponse = await ml.esSearch(esSearchRequest);

      const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));
      setRowCount(resp.hits.total.value);
      setRowCountRelation(resp.hits.total.relation);
      setTableItems(docs);
      setStatus(INDEX_STATUS.LOADED);
    } catch (e) {
      setErrorMessage(extractErrorMessage(e));
      setStatus(INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    if (query !== undefined) {
      getIndexData();
    }
    // custom comparison
  }, [indexPattern.title, indexPatternFields, JSON.stringify([query, pagination, sortingColumns])]);

  const dataLoader = useMemo(() => new DataLoader(indexPattern, toastNotifications), [
    indexPattern,
  ]);

  const fetchColumnChartsData = async function (fieldHistogramsQuery: Record<string, any>) {
    try {
      const columnChartsData = await dataLoader.loadFieldHistograms(
        columns
          .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
          .map((cT) => ({
            fieldName: cT.id,
            type: getFieldType(cT.schema),
          })),
        fieldHistogramsQuery
      );
      dataGrid.setColumnCharts(columnChartsData);
    } catch (e) {
      showDataGridColumnChartErrorMessageToast(e, toastNotifications);
    }
  };

  useEffect(() => {
    if (dataGrid.chartsVisible && query !== undefined) {
      fetchColumnChartsData(query);
    }
    // custom comparison
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
