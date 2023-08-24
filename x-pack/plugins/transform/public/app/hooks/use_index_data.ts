/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridColumn } from '@elastic/eui';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { isRuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getDataGridSchemaFromESFieldType,
  getFieldsFromKibanaIndexPattern,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  getProcessedFields,
  type EsSorting,
  type UseIndexDataReturnType,
  INDEX_STATUS,
} from '@kbn/ml-data-grid';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';

import {
  isEsSearchResponse,
  isFieldHistogramsResponseSchema,
} from '../../../common/api_schemas/type_guards';
import {
  hasKeywordDuplicate,
  isKeywordDuplicate,
  removeKeywordPostfix,
} from '../../../common/utils/field_utils';
import { getErrorMessage } from '../../../common/utils/errors';

import { isDefaultQuery, matchAllQuery, TransformConfigQuery } from '../common';
import { useToastNotifications, useAppDependencies } from '../app_dependencies';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define/common';

import { SearchItems } from './use_search_items';
import { useApi } from './use_api';
import { useDataSearch } from './use_data_search';

export const useIndexData = (
  dataView: SearchItems['dataView'],
  query: TransformConfigQuery,
  combinedRuntimeMappings?: StepDefineExposedState['runtimeMappings'],
  timeRangeMs?: TimeRangeMs,
  populatedFields?: Set<string> | null
): UseIndexDataReturnType => {
  const { analytics } = useAppDependencies();

  // Store the performance metric's start time using a ref
  // to be able to track it across rerenders.
  const loadIndexDataStartTime = useRef<number | undefined>(window.performance.now());

  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);

  const api = useApi();
  const dataSearch = useDataSearch();
  const toastNotifications = useToastNotifications();

  const [dataViewFields, setDataViewFields] = useState<string[]>();

  const baseFilterCriteria = buildBaseFilterCriteria(
    dataView.timeFieldName,
    timeRangeMs?.from,
    timeRangeMs?.to,
    query
  );

  const defaultQuery = useMemo(
    () => (timeRangeMs && dataView.timeFieldName ? baseFilterCriteria[0] : matchAllQuery),
    [baseFilterCriteria, dataView, timeRangeMs]
  );

  const queryWithBaseFilterCriteria = {
    bool: {
      filter: baseFilterCriteria,
    },
  };

  useEffect(() => {
    if (dataView.timeFieldName !== undefined && timeRangeMs === undefined) {
      return;
    }
    const abortController = new AbortController();

    // Fetch 500 random documents to determine populated fields.
    // This is a workaround to avoid passing potentially thousands of unpopulated fields
    // (for example, as part of filebeat/metricbeat/ECS based indices)
    // to the data grid component which would significantly slow down the page.
    const fetchDataGridSampleDocuments = async function () {
      let populatedDataViewFields =  populatedFields ? [...populatedFields] :[]
      let isMissingFields = populatedDataViewFields.length === 0;

      // If populatedFields are not provided, make own request to calculate
      if (populatedFields === undefined){
        setErrorMessage('');
        setStatus(INDEX_STATUS.LOADING);

        const esSearchRequest = {
          index: indexPattern,
          body: {
            fields: ['*'],
            _source: false,
            query: {
              function_score: {
                query: defaultQuery,
                random_score: {},
              },
            },
            size: 500,
          },
        };

        const resp = await dataSearch(esSearchRequest, abortController.signal);

        if (!isEsSearchResponse(resp)) {
          setErrorMessage(getErrorMessage(resp));
          setStatus(INDEX_STATUS.ERROR);
          return;
        }
        const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));
        isMissingFields = resp.hits.hits.every((d) => typeof d.fields === 'undefined');

        populatedDataViewFields = [...new Set(docs.map(Object.keys).flat(1))]

      }
      const isCrossClusterSearch = indexPattern.includes(':');

      // Get all field names for each returned doc and flatten it
      // to a list of unique field names used across all docs.
      const allDataViewFields = getFieldsFromKibanaIndexPattern(dataView);
      const dataViewFields = populatedDataViewFields
        .filter((d) => allDataViewFields.includes(d))
        .sort();

      setCcsWarning(isCrossClusterSearch && isMissingFields);
      setStatus(INDEX_STATUS.LOADED);
      setDataViewFields(dataViewFields);
    };

    fetchDataGridSampleDocuments();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRangeMs, populatedFields?.size]);

  const columns: EuiDataGridColumn[] = useMemo(() => {
    if (typeof dataViewFields === 'undefined') {
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

  useEffect(() => {
    if (typeof dataViewFields === 'undefined') {
      return;
    }
    const abortController = new AbortController();

    const fetchDataGridData = async function () {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      const sort: EsSorting = sortingColumns.reduce((s, column) => {
        s[column.id] = { order: column.direction };
        return s;
      }, {} as EsSorting);

      const esSearchRequest = {
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
      };
      const resp = await dataSearch(esSearchRequest, abortController.signal);

      if (!isEsSearchResponse(resp)) {
        setErrorMessage(getErrorMessage(resp));
        setStatus(INDEX_STATUS.ERROR);
        return;
      }

      const isCrossClusterSearch = indexPattern.includes(':');
      const isMissingFields = resp.hits.hits.every((d) => typeof d.fields === 'undefined');

      const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

      setCcsWarning(isCrossClusterSearch && isMissingFields);
      setRowCountInfo({
        rowCount: typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total!.value,
        rowCountRelation:
          typeof resp.hits.total === 'number'
            ? ('eq' as estypes.SearchTotalHitsRelation)
            : resp.hits.total!.relation,
      });
      setTableItems(docs);
      setStatus(INDEX_STATUS.LOADED);
    };

    fetchDataGridData();

    return () => {
      abortController.abort();
    };
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    indexPattern,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([
      query,
      pagination,
      sortingColumns,
      dataViewFields,
      combinedRuntimeMappings,
      timeRangeMs,
    ]),
  ]);

  useEffect(() => {
    const fetchColumnChartsData = async function () {
      const allDataViewFieldNames = new Set(dataView.fields.map((f) => f.name));
      const columnChartsData = await api.getHistogramsForFields(
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
        combinedRuntimeMappings
      );

      if (!isFieldHistogramsResponseSchema(columnChartsData)) {
        showDataGridColumnChartErrorMessageToast(columnChartsData, toastNotifications);
        return;
      }

      setColumnCharts(
        // revert field names with `.keyword` used to do aggregations to their original column name
        columnChartsData.map((d) => ({
          ...d,
          ...(isKeywordDuplicate(d.id, allDataViewFieldNames)
            ? { id: removeKeywordPostfix(d.id) }
            : {}),
        }))
      );
    };

    if (chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chartsVisible,
    indexPattern,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, dataGrid.visibleColumns, combinedRuntimeMappings, timeRangeMs]),
  ]);

  const renderCellValue = useRenderCellValue(dataView, pagination, tableItems);

  if (
    dataGrid.status === INDEX_STATUS.LOADED &&
    dataViewFields !== undefined &&
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

  return {
    ...dataGrid,
    renderCellValue,
  };
};
