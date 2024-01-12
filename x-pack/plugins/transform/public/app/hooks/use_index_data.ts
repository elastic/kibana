/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridColumn } from '@elastic/eui';

import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { isRuntimeMappings } from '@kbn/ml-runtime-field-utils';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';
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

import {
  hasKeywordDuplicate,
  isKeywordDuplicate,
  removeKeywordPostfix,
} from '../../../common/utils/field_utils';
import { getErrorMessage } from '../../../common/utils/errors';

import { isDefaultQuery, matchAllQuery } from '../common';
import { useToastNotifications, useAppDependencies } from '../app_dependencies';
import { useWizardSelector } from '../sections/create_transform/state_management/create_transform_store';
import { selectTransformConfigQuery } from '../sections/create_transform/state_management/step_define_selectors';
import { useDataView } from '../sections/create_transform/components/wizard/wizard';

import { useGetHistogramsForFields } from './use_get_histograms_for_fields';
import { useDataSearch } from './use_data_search';

type PopulatedFields = Set<string>;
const isPopulatedFields = (arg: unknown): arg is PopulatedFields => arg instanceof Set;

export const useIndexData = (): UseIndexDataReturnType => {
  const { analytics, ml } = useAppDependencies();
  const { useFieldStatsFlyoutContext } = ml;
  const fieldStatsContext = useFieldStatsFlyoutContext();

  const dataView = useDataView();

  const timeRangeMs = useWizardSelector((s) => s.stepDefine.timeRangeMs);
  const combinedRuntimeMappings = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.runtimeMappings
  );
  const transformConfigQuery = useSelector(selectTransformConfigQuery);

  const populatedFields = isPopulatedFields(fieldStatsContext?.populatedFields)
    ? [...fieldStatsContext.populatedFields]
    : [];

  // Store the performance metric's start time using a ref
  // to be able to track it across rerenders.
  const loadIndexDataStartTime = useRef<number | undefined>(window.performance.now());

  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);
  const toastNotifications = useToastNotifications();

  const baseFilterCriteria = buildBaseFilterCriteria(
    dataView.timeFieldName,
    timeRangeMs?.from,
    timeRangeMs?.to,
    transformConfigQuery
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

  // Fetch 500 random documents to determine populated fields.
  // This is a workaround to avoid passing potentially thousands of unpopulated fields
  // (for example, as part of filebeat/metricbeat/ECS based indices)
  // to the data grid component which would significantly slow down the page.
  const {
    error: dataViewFieldsError,
    data: dataViewFieldsData,
    isError: dataViewFieldsIsError,
    isLoading: dataViewFieldsIsLoading,
  } = useDataSearch(
    {
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
    },
    // Check whether fetching should be enabled
    // If populatedFields are not provided, make own request to calculate
    !Array.isArray(populatedFields) &&
      !(dataView.timeFieldName !== undefined && timeRangeMs === undefined)
  );

  useEffect(() => {
    if (dataViewFieldsIsLoading && !dataViewFieldsIsError) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);
    } else if (dataViewFieldsError !== null) {
      setErrorMessage(getErrorMessage(dataViewFieldsError));
      setStatus(INDEX_STATUS.ERROR);
    } else if (
      !dataViewFieldsIsLoading &&
      !dataViewFieldsIsError &&
      dataViewFieldsData !== undefined
    ) {
      const isCrossClusterSearch = indexPattern.includes(':');
      const isMissingFields = dataViewFieldsData.hits.hits.every(
        (d) => typeof d.fields === 'undefined'
      );

      setCcsWarning(isCrossClusterSearch && isMissingFields);
      setStatus(INDEX_STATUS.LOADED);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewFieldsData, dataViewFieldsError, dataViewFieldsIsError, dataViewFieldsIsLoading]);

  const dataViewFields = useMemo(() => {
    let allPopulatedFields = Array.isArray(populatedFields) ? populatedFields : [];

    if (populatedFields === undefined && dataViewFieldsData) {
      // Get all field names for each returned doc and flatten it
      // to a list of unique field names used across all docs.
      const docs = dataViewFieldsData.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));
      allPopulatedFields = [...new Set(docs.map(Object.keys).flat(1))];
    }

    const allDataViewFields = getFieldsFromKibanaDataView(dataView);
    return allPopulatedFields.filter((d) => allDataViewFields.includes(d)).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewFieldsData, populatedFields]);

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
  }, [JSON.stringify([transformConfigQuery, timeRangeMs])]);

  const sort: EsSorting = sortingColumns.reduce((s, column) => {
    s[column.id] = { order: column.direction };
    return s;
  }, {} as EsSorting);

  const {
    error: dataGridDataError,
    data: dataGridData,
    isError: dataGridDataIsError,
    isLoading: dataGridDataIsLoading,
  } = useDataSearch(
    {
      index: indexPattern,
      body: {
        fields: ['*'],
        _source: false,
        query: isDefaultQuery(transformConfigQuery) ? defaultQuery : queryWithBaseFilterCriteria,
        from: pagination.pageIndex * pagination.pageSize,
        size: pagination.pageSize,
        ...(Object.keys(sort).length > 0 ? { sort } : {}),
        ...(isRuntimeMappings(combinedRuntimeMappings)
          ? { runtime_mappings: combinedRuntimeMappings }
          : {}),
      },
    },
    // Check whether fetching should be enabled
    dataViewFields !== undefined
  );

  useEffect(() => {
    if (dataGridDataIsLoading && !dataGridDataIsError) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);
    } else if (dataGridDataError !== null) {
      setErrorMessage(getErrorMessage(dataGridDataError));
      setStatus(INDEX_STATUS.ERROR);
    } else if (!dataGridDataIsLoading && !dataGridDataIsError && dataGridData !== undefined) {
      const isCrossClusterSearch = indexPattern.includes(':');
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
  }, [dataGridData, dataGridDataError, dataGridDataIsError, dataGridDataIsLoading]);

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
      isDefaultQuery(transformConfigQuery) ? defaultQuery : queryWithBaseFilterCriteria,
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
    dataViewFields !== undefined &&
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
      rowCount: loadIndexDataStartTime.current === undefined ? dataGrid.rowCount : 0,
      renderCellValue,
    }),
    [dataGrid, renderCellValue]
  );
};
