/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type { estypes } from '@elastic/elasticsearch';
import type { EuiDataGridColumn } from '@elastic/eui';

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
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define/common';
import { isRuntimeMappings } from '../../../common/shared_imports';

export const useIndexData = (
  indexPattern: SearchItems['indexPattern'],
  query: PivotQuery,
  combinedRuntimeMappings?: StepDefineExposedState['runtimeMappings']
): UseIndexDataReturnType => {
  const api = useApi();
  const toastNotifications = useToastNotifications();
  const {
    ml: {
      getFieldType,
      getDataGridSchemaFromKibanaFieldType,
      getDataGridSchemaFromESFieldType,
      getFieldsFromKibanaIndexPattern,
      showDataGridColumnChartErrorMessageToast,
      useDataGrid,
      useRenderCellValue,
      getProcessedFields,
      INDEX_STATUS,
    },
  } = useAppDependencies();

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

    const resp = await api.esSearch(esSearchRequest);

    if (!isEsSearchResponse(resp)) {
      setErrorMessage(getErrorMessage(resp));
      setStatus(INDEX_STATUS.ERROR);
      return;
    }

    const isCrossClusterSearch = indexPattern.title.includes(':');
    const isMissingFields = resp.hits.hits.every((d) => typeof d.fields === 'undefined');

    const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

    // Get all field names for each returned doc and flatten it
    // to a list of unique field names used across all docs.
    const allKibanaIndexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);
    const populatedFields = [...new Set(docs.map(Object.keys).flat(1))]
      .filter((d) => allKibanaIndexPatternFields.includes(d))
      .sort();

    setCcsWarning(isCrossClusterSearch && isMissingFields);
    setStatus(INDEX_STATUS.LOADED);
    setIndexPatternFields(populatedFields);
  };

  useEffect(() => {
    fetchDataGridSampleDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: EuiDataGridColumn[] = useMemo(() => {
    if (typeof indexPatternFields === 'undefined') {
      return [];
    }

    let result: Array<{ id: string; schema: string | undefined }> = [];

    // Get the the runtime fields that are defined from API field and index patterns
    if (combinedRuntimeMappings !== undefined) {
      result = Object.keys(combinedRuntimeMappings).map((fieldName) => {
        const field = combinedRuntimeMappings[fieldName];
        const schema = getDataGridSchemaFromESFieldType(field.type);
        return { id: fieldName, schema };
      });
    }

    // Combine the runtime field that are defined from API field
    indexPatternFields.forEach((id) => {
      const field = indexPattern.fields.getByName(id);
      if (!field?.runtimeField) {
        const schema = getDataGridSchemaFromKibanaFieldType(field);
        result.push({ id, schema });
      }
    });

    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [
    indexPatternFields,
    indexPattern.fields,
    combinedRuntimeMappings,
    getDataGridSchemaFromESFieldType,
    getDataGridSchemaFromKibanaFieldType,
  ]);

  // EuiDataGrid State

  const dataGrid = useDataGrid(columns);

  const {
    chartsVisible,
    pagination,
    resetPagination,
    setColumnCharts,
    setCcsWarning,
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
        ...(isRuntimeMappings(combinedRuntimeMappings)
          ? { runtime_mappings: combinedRuntimeMappings }
          : {}),
      },
    };
    const resp = await api.esSearch(esSearchRequest);

    if (!isEsSearchResponse(resp)) {
      setErrorMessage(getErrorMessage(resp));
      setStatus(INDEX_STATUS.ERROR);
      return;
    }

    const isCrossClusterSearch = indexPattern.title.includes(':');
    const isMissingFields = resp.hits.hits.every((d) => typeof d.fields === 'undefined');

    const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

    setCcsWarning(isCrossClusterSearch && isMissingFields);
    setRowCount(typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total.value);
    setRowCountRelation(
      typeof resp.hits.total === 'number'
        ? ('eq' as estypes.TotalHitsRelation)
        : resp.hits.total.relation
    );
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
      isDefaultQuery(query) ? matchAllQuery : query,
      combinedRuntimeMappings
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
  }, [
    indexPattern.title,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([
      query,
      pagination,
      sortingColumns,
      indexPatternFields,
      combinedRuntimeMappings,
    ]),
  ]);

  useEffect(() => {
    if (chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chartsVisible,
    indexPattern.title,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, dataGrid.visibleColumns, combinedRuntimeMappings]),
  ]);

  const renderCellValue = useRenderCellValue(indexPattern, pagination, tableItems);

  return {
    ...dataGrid,
    renderCellValue,
  };
};
