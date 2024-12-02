/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridColumn } from '@elastic/eui';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { isRuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { buildBaseFilterCriteria, isDefaultQuery, matchAllQuery } from '@kbn/ml-query-utils';
import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getDataGridSchemaFromESFieldType,
  getFieldsFromKibanaDataView,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  getProcessedFields,
  type EsSorting,
  type UseIndexDataReturnType,
  INDEX_STATUS,
} from '@kbn/ml-data-grid';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import { isCCSRemoteIndexName } from '@kbn/es-query';
import {
  hasKeywordDuplicate,
  isKeywordDuplicate,
  removeKeywordPostfix,
} from '../../../common/utils/field_utils';
import { getErrorMessage } from '../../../common/utils/errors';

import type { TransformConfigQuery } from '../common';
import { useToastNotifications, useAppDependencies } from '../app_dependencies';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define/common';

import type { SearchItems } from './use_search_items';
import { useGetHistogramsForFields } from './use_get_histograms_for_fields';
import { useDataSearch } from './use_data_search';

interface UseIndexDataOptions {
  dataView: SearchItems['dataView'];
  query: TransformConfigQuery;
  populatedFields: string[];
  combinedRuntimeMappings?: StepDefineExposedState['runtimeMappings'];
  timeRangeMs?: TimeRangeMs;
}

export const useIndexData = (options: UseIndexDataOptions): UseIndexDataReturnType => {
  const { dataView, query, populatedFields, combinedRuntimeMappings, timeRangeMs } = options;
  const { analytics } = useAppDependencies();

  // Store the performance metric's start time using a ref
  // to be able to track it across rerenders.
  const loadIndexDataStartTime = useRef<number | undefined>(window.performance.now());

  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const toastNotifications = useToastNotifications();

  const baseFilterCriteria = useMemo(
    () =>
      buildBaseFilterCriteria(dataView.timeFieldName, timeRangeMs?.from, timeRangeMs?.to, query),
    [dataView.timeFieldName, query, timeRangeMs]
  );

  const defaultQuery = useMemo(
    () => (timeRangeMs && dataView.timeFieldName ? baseFilterCriteria[0] : matchAllQuery),
    [baseFilterCriteria, dataView, timeRangeMs]
  );

  const queryWithBaseFilterCriteria = useMemo(
    () => ({
      bool: {
        filter: baseFilterCriteria,
      },
    }),
    [baseFilterCriteria]
  );

  const dataViewFields = useMemo(() => {
    const allPopulatedFields = Array.isArray(populatedFields) ? populatedFields : [];
    const allDataViewFields = getFieldsFromKibanaDataView(dataView);
    return allPopulatedFields.filter((d) => allDataViewFields.includes(d)).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [populatedFields]);

  const columns: EuiDataGridColumn[] = useMemo(() => {
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
    dataViewFields.forEach((id) => {
      const field = dataView.fields.getByName(id);
      if (!field?.runtimeField) {
        const schema = getDataGridSchemaFromKibanaFieldType(field);
        result.push({ id, schema });
      }
    });

    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [dataViewFields, dataView.fields, combinedRuntimeMappings]);

  // EuiDataGrid State

  const dataGrid = useDataGrid(columns);

  const {
    chartsVisible,
    pagination,
    resetPagination,
    setColumnCharts,
    setCcsWarning,
    setErrorMessage,
    setRowCountInfo,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  useEffect(() => {
    resetPagination();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([query, timeRangeMs])]);

  const sort: EsSorting = sortingColumns.reduce((s, column) => {
    s[column.id] = { order: column.direction };
    return s;
  }, {} as EsSorting);

  const {
    error: dataGridDataError,
    data: dataGridData,
    isError: dataGridDataIsError,
    // React Query v4 has the weird behavior that `isLoading` is `true` on load
    // when a query is disabled, that's why we need to use `isFetching` here.
    isFetching: dataGridDataIsLoading,
  } = useDataSearch(
    {
      index: indexPattern,
      body: {
        fields: ['*'],
        _source: false,
        query: isDefaultQuery(query) ? defaultQuery : queryWithBaseFilterCriteria,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
        ...(isRuntimeMappings(combinedRuntimeMappings)
          ? { runtime_mappings: combinedRuntimeMappings }
          : {}),
      },
    },
    // Check whether fetching should be enabled
    dataViewFields.length > 0
  );

  useEffect(() => {
    if (dataGridDataIsLoading && !dataGridDataIsError) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);
    } else if (dataGridDataError !== null) {
      setErrorMessage(getErrorMessage(dataGridDataError));
      setStatus(INDEX_STATUS.ERROR);
    } else if (!dataGridDataIsLoading && !dataGridDataIsError && dataGridData !== undefined) {
      const isCrossClusterSearch = isCCSRemoteIndexName(indexPattern);
      const isMissingFields = dataGridData.hits.hits.every((d) => typeof d.fields === 'undefined');

      const docs = dataGridData.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

      setCcsWarning(isCrossClusterSearch && isMissingFields);
      setRowCountInfo({
        rowCount:
          typeof dataGridData.hits.total === 'number'
            ? dataGridData.hits.total
            : dataGridData.hits.total!.value,
        rowCountRelation:
          typeof dataGridData.hits.total === 'number'
            ? ('eq' as estypes.SearchTotalHitsRelation)
            : dataGridData.hits.total!.relation,
      });
      setTableItems(docs);
      setStatus(INDEX_STATUS.LOADED);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataGridDataError, dataGridDataIsError, dataGridDataIsLoading, dataGridData]);

  const allDataViewFieldNames = new Set(dataView.fields.map((f) => f.name));
  const { error: histogramsForFieldsError, data: histogramsForFieldsData } =
    useGetHistogramsForFields(
      indexPattern,
      columns
        .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
        .map((cT) => {
          // If a column field name has a corresponding keyword field,
          // fetch the keyword field instead to be able to do aggregations.
          const fieldName = cT.id;
          return hasKeywordDuplicate(fieldName, allDataViewFieldNames)
            ? {
                fieldName: `${fieldName}.keyword`,
                type: getFieldType(undefined),
              }
            : {
                fieldName,
                type: getFieldType(cT.schema),
              };
        }),
      isDefaultQuery(query) ? defaultQuery : queryWithBaseFilterCriteria,
      combinedRuntimeMappings,
      chartsVisible
    );

  useEffect(() => {
    if (histogramsForFieldsError !== null) {
      showDataGridColumnChartErrorMessageToast(histogramsForFieldsError, toastNotifications);
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histogramsForFieldsError]);

  useEffect(() => {
    if (histogramsForFieldsData) {
      setColumnCharts(
        // revert field names with `.keyword` used to do aggregations to their original column name
        histogramsForFieldsData.map((d) => ({
          ...d,
          ...(isKeywordDuplicate(d.id, allDataViewFieldNames)
            ? { id: removeKeywordPostfix(d.id) }
            : {}),
        }))
      );
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histogramsForFieldsData]);

  const renderCellValue = useRenderCellValue(dataView, pagination, tableItems);

  if (
    dataGrid.status === INDEX_STATUS.LOADED &&
    dataViewFields.length > 0 &&
    Array.isArray(histogramsForFieldsData) &&
    histogramsForFieldsData.length > 0 &&
    loadIndexDataStartTime.current !== undefined
  ) {
    const loadIndexDataDuration = window.performance.now() - loadIndexDataStartTime.current;

    // Set this to undefined so reporting the metric gets triggered only once.
    loadIndexDataStartTime.current = undefined;

    reportPerformanceMetricEvent(analytics, {
      eventName: 'transformLoadIndexPreview',
      duration: loadIndexDataDuration,
    });
  }

  return useMemo(
    () => ({
      ...dataGrid,
      renderCellValue,
    }),
    [dataGrid, renderCellValue]
  );
};
