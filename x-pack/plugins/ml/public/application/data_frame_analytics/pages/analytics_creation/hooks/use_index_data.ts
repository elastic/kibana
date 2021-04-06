/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { estypes } from '@elastic/elasticsearch';
import { EuiDataGridColumn } from '@elastic/eui';
import { CoreSetup } from 'src/core/public';

import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';
import { isRuntimeMappings } from '../../../../../../common/util/runtime_field_utils';
import { RuntimeMappings, RuntimeField } from '../../../../../../common/types/fields';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '../../../../../../common/constants/field_histograms';

import { DataLoader } from '../../../../datavisualizer/index_based/data_loader';

import {
  getFieldType,
  getDataGridSchemaFromKibanaFieldType,
  getDataGridSchemaFromESFieldType,
  getFieldsFromKibanaIndexPattern,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  EsSorting,
  UseIndexDataReturnType,
  getProcessedFields,
  getCombinedRuntimeMappings,
} from '../../../../components/data_grid';
import { extractErrorMessage } from '../../../../../../common/util/errors';
import { INDEX_STATUS } from '../../../common/analytics';
import { ml } from '../../../../services/ml_api_service';

type IndexSearchResponse = estypes.SearchResponse;

interface MLEuiDataGridColumn extends EuiDataGridColumn {
  isRuntimeFieldColumn?: boolean;
}

function getRuntimeFieldColumns(runtimeMappings: RuntimeMappings) {
  return Object.keys(runtimeMappings).map((id) => {
    const field = runtimeMappings[id];
    const schema = getDataGridSchemaFromESFieldType(field.type as RuntimeField['type']);
    return { id, schema, isExpandable: schema !== 'boolean', isRuntimeFieldColumn: true };
  });
}

export const useIndexData = (
  indexPattern: IndexPattern,
  query: Record<string, any> | undefined,
  toastNotifications: CoreSetup['notifications']['toasts'],
  runtimeMappings?: RuntimeMappings
): UseIndexDataReturnType => {
  const indexPatternFields = useMemo(() => getFieldsFromKibanaIndexPattern(indexPattern), [
    indexPattern,
  ]);

  const [columns, setColumns] = useState<MLEuiDataGridColumn[]>([
    ...indexPatternFields.map((id) => {
      const field = indexPattern.fields.getByName(id);
      const isRuntimeFieldColumn = field?.runtimeField !== undefined;
      const schema = isRuntimeFieldColumn
        ? getDataGridSchemaFromESFieldType(field?.type as RuntimeField['type'])
        : getDataGridSchemaFromKibanaFieldType(field);
      return {
        id,
        schema,
        isExpandable: schema !== 'boolean',
        isRuntimeFieldColumn,
      };
    }),
  ]);

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

    const combinedRuntimeMappings = getCombinedRuntimeMappings(indexPattern, runtimeMappings);

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
        ...(isRuntimeMappings(combinedRuntimeMappings)
          ? { runtime_mappings: combinedRuntimeMappings }
          : {}),
      },
    };

    try {
      const resp: IndexSearchResponse = await ml.esSearch(esSearchRequest);
      const docs = resp.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

      if (isRuntimeMappings(runtimeMappings)) {
        // remove old runtime field from columns
        const updatedColumns = columns.filter((col) => col.isRuntimeFieldColumn === false);
        setColumns([
          ...updatedColumns,
          ...(combinedRuntimeMappings ? getRuntimeFieldColumns(combinedRuntimeMappings) : []),
        ]);
      } else {
        setColumns([
          ...indexPatternFields.map((id) => {
            const field = indexPattern.fields.getByName(id);
            const schema = getDataGridSchemaFromKibanaFieldType(field);
            return {
              id,
              schema,
              isExpandable: schema !== 'boolean',
              isRuntimeFieldColumn: field?.runtimeField !== undefined,
            };
          }),
        ]);
      }
      setRowCount(typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total.value);
      setRowCountRelation(
        typeof resp.hits.total === 'number'
          ? ('eq' as estypes.TotalHitsRelation)
          : resp.hits.total.relation
      );
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
  }, [
    indexPattern.title,
    indexPatternFields,
    JSON.stringify([query, pagination, sortingColumns, runtimeMappings]),
  ]);

  const dataLoader = useMemo(() => new DataLoader(indexPattern, toastNotifications), [
    indexPattern,
  ]);

  const fetchColumnChartsData = async function (fieldHistogramsQuery: Record<string, any>) {
    const combinedRuntimeMappings = getCombinedRuntimeMappings(indexPattern, runtimeMappings);
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
  };

  useEffect(() => {
    if (dataGrid.chartsVisible && query !== undefined) {
      fetchColumnChartsData(query);
    }
    // custom comparison
  }, [
    dataGrid.chartsVisible,
    indexPattern.title,
    JSON.stringify([query, dataGrid.visibleColumns, runtimeMappings]),
  ]);

  const renderCellValue = useRenderCellValue(indexPattern, pagination, tableItems);

  return {
    ...dataGrid,
    renderCellValue,
  };
};
