/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridColumn } from '@elastic/eui';

import type { CoreSetup } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';
import {
  getCombinedRuntimeMappings,
  isRuntimeMappings,
  type RuntimeMappings,
} from '@kbn/ml-runtime-field-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { EsSorting, UseIndexDataReturnType } from '@kbn/ml-data-grid';
import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getDataGridSchemaFromESFieldType,
  getFieldsFromKibanaDataView,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  getProcessedFields,
  INDEX_STATUS,
} from '@kbn/ml-data-grid';

import { useMlApiContext } from '../../../../contexts/kibana';
import { DataLoader } from '../../../../datavisualizer/index_based/data_loader';

type IndexSearchResponse = estypes.SearchResponse;

interface MLEuiDataGridColumn extends EuiDataGridColumn {
  isRuntimeFieldColumn?: boolean;
}

function getRuntimeFieldColumns(runtimeMappings: RuntimeMappings) {
  return Object.keys(runtimeMappings).map((id) => {
    let field = runtimeMappings[id];
    if (Array.isArray(field)) {
      field = field[0];
    }
    const schema = getDataGridSchemaFromESFieldType(
      field.type as estypes.MappingRuntimeField['type']
    );
    return { id, schema, isExpandable: schema !== 'boolean', isRuntimeFieldColumn: true };
  });
}

function getDataViewColumns(dataView: DataView, fieldsFilter: string[]) {
  const { fields } = dataView;

  return fields
    .filter((field) => fieldsFilter.includes(field.name))
    .map((field) => {
      const schema =
        // @ts-expect-error field is not DataViewField
        getDataGridSchemaFromESFieldType(field.type) || getDataGridSchemaFromKibanaFieldType(field);

      return {
        id: field.name,
        schema,
        isExpandable: schema !== 'boolean',
        isRuntimeFieldColumn: false,
      };
    });
}

export const useIndexData = (
  dataView: DataView,
  query: Record<string, any> | undefined,
  toastNotifications: CoreSetup['notifications']['toasts'],
  runtimeMappings?: RuntimeMappings
): UseIndexDataReturnType => {
  const ml = useMlApiContext();
  // Fetch 500 random documents to determine populated fields.
  // This is a workaround to avoid passing potentially thousands of unpopulated fields
  // (for example, as part of filebeat/metricbeat/ECS based indices)
  // to the data grid component which would significantly slow down the page.
  const [dataViewFields, setDataViewFields] = useState<string[]>();
  const [timeRangeMs, setTimeRangeMs] = useState<TimeRangeMs | undefined>();

  useEffect(() => {
    async function fetchDataGridSampleDocuments() {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      const esSearchRequest = {
        index: dataView.title,
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
        const allDataViewFields = getFieldsFromKibanaDataView(dataView);
        const populatedFields = [...new Set(docs.map(Object.keys).flat(1))]
          .filter((d) => allDataViewFields.includes(d))
          .sort();

        setStatus(INDEX_STATUS.LOADED);
        setDataViewFields(populatedFields);
      } catch (e) {
        setErrorMessage(extractErrorMessage(e));
        setStatus(INDEX_STATUS.ERROR);
      }
    }

    fetchDataGridSampleDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // To be used for data grid column selection
  // and will be applied to doc and chart queries.
  const combinedRuntimeMappings = useMemo(
    () => getCombinedRuntimeMappings(dataView, runtimeMappings),
    [dataView, runtimeMappings]
  );

  // Available data grid columns, will be a combination of index pattern and runtime fields.
  const [columns, setColumns] = useState<MLEuiDataGridColumn[]>([]);
  useEffect(() => {
    if (Array.isArray(dataViewFields)) {
      setColumns([
        ...getDataViewColumns(dataView, dataViewFields),
        ...(combinedRuntimeMappings ? getRuntimeFieldColumns(combinedRuntimeMappings) : []),
      ]);
    }
  }, [dataView, dataViewFields, combinedRuntimeMappings]);

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    resetPagination,
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
  }, [JSON.stringify(query)]);

  useEffect(() => {
    async function fetchIndexData() {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      const timeFieldName = dataView.getTimeField()?.name;
      const sort: EsSorting = sortingColumns.reduce((s, column) => {
        s[column.id] = { order: column.direction };
        return s;
      }, {} as EsSorting);
      const esSearchRequest = {
        index: dataView.title,
        body: {
          query,
          from: pagination.pageIndex * pagination.pageSize,
          size: pagination.pageSize,
          fields: [
            ...(dataViewFields ?? []),
            ...(isRuntimeMappings(combinedRuntimeMappings)
              ? Object.keys(combinedRuntimeMappings)
              : []),
          ],
          _source: false,
          ...(Object.keys(sort).length > 0 ? { sort } : {}),
          ...(isRuntimeMappings(combinedRuntimeMappings)
            ? { runtime_mappings: combinedRuntimeMappings }
            : {}),
          ...(timeFieldName
            ? {
                aggs: {
                  earliest: {
                    min: {
                      field: timeFieldName,
                    },
                  },
                  latest: {
                    max: {
                      field: timeFieldName,
                    },
                  },
                },
              }
            : {}),
        },
      };

      try {
        const resp: IndexSearchResponse = await ml.esSearch(esSearchRequest);

        if (
          resp.aggregations &&
          isPopulatedObject(resp.aggregations.earliest, ['value']) &&
          isPopulatedObject(resp.aggregations.latest, ['value'])
        ) {
          setTimeRangeMs({
            from: resp.aggregations.earliest.value as number,
            to: resp.aggregations.latest.value as number,
          } as TimeRangeMs);
        }
        const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

        setRowCountInfo({
          rowCount: typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total!.value,
          rowCountRelation:
            typeof resp.hits.total === 'number'
              ? ('eq' as estypes.SearchTotalHitsRelation)
              : resp.hits.total!.relation,
        });
        setTableItems(docs);
        setStatus(INDEX_STATUS.LOADED);
      } catch (e) {
        setErrorMessage(extractErrorMessage(e));
        setStatus(INDEX_STATUS.ERROR);
      }
    }

    if (dataViewFields !== undefined && query !== undefined) {
      fetchIndexData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataView.title,
    dataViewFields,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, pagination, sortingColumns, combinedRuntimeMappings]),
  ]);

  const dataLoader = useMemo(
    () => new DataLoader(dataView, ml),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataView]
  );

  useEffect(() => {
    async function fetchColumnChartsData(fieldHistogramsQuery: Record<string, any>) {
      try {
        const columnChartsData = await dataLoader.loadFieldHistograms(
          columns
            .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
            .map((cT) => ({
              fieldName: cT.id,
              type: getFieldType(cT.schema),
            })),
          fieldHistogramsQuery,
          DEFAULT_SAMPLER_SHARD_SIZE,
          combinedRuntimeMappings
        );
        dataGrid.setColumnCharts(columnChartsData);
      } catch (e) {
        showDataGridColumnChartErrorMessageToast(e, toastNotifications);
      }
    }

    if (dataGrid.chartsVisible && query !== undefined) {
      fetchColumnChartsData(query);
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataGrid.chartsVisible,
    dataView.title,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([query, dataGrid.visibleColumns, runtimeMappings]),
  ]);

  const renderCellValue = useRenderCellValue(dataView, pagination, tableItems);

  return {
    ...dataGrid,
    dataViewFields,
    renderCellValue,
    timeRangeMs,
  };
};
