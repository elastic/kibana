/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { useEffect, useMemo, useState } from 'react';

import type { EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { getFlattenedObject } from '@kbn/std';

import { difference } from 'lodash';

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { ES_CLIENT_TOTAL_HITS_RELATION } from '@kbn/ml-query-utils';
import {
  getDataGridSchemaFromESFieldType,
  multiColumnSortFactory,
  getNestedOrEscapedVal,
  useDataGrid,
  type RenderCellValue,
  type UseIndexDataReturnType,
  INDEX_STATUS,
} from '@kbn/ml-data-grid';

import type { PreviewMappingsProperties } from '../../../common/api_schemas/transforms';

import { getErrorMessage } from '../../../common/utils/errors';

import { getPreviewTransformRequestBody, type TransformConfigQuery } from '../common';

import type { SearchItems } from './use_search_items';
import { useGetTransformsPreview } from './use_get_transforms_preview';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import {
  isLatestPartialRequest,
  isPivotPartialRequest,
} from '../sections/create_transform/components/step_define/common/types';

function sortColumns(groupByArr: string[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (
      groupByArr.some((aggName) => aggName === a) &&
      groupByArr.some((aggName) => aggName === b)
    ) {
      return a.localeCompare(b);
    }
    if (groupByArr.some((aggName) => aggName === a)) {
      return -1;
    }
    if (groupByArr.some((aggName) => aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

function sortColumnsForLatest(sortField: string) {
  return (a: string, b: string) => {
    // make sure sort field is always the most left column
    if (sortField === a && sortField === b) {
      return a.localeCompare(b);
    }
    if (sortField === a) {
      return -1;
    }
    if (sortField === b) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

/**
 * Extracts missing mappings from docs.
 */
export function getCombinedProperties(
  populatedProperties: PreviewMappingsProperties,
  docs: Array<Record<string, unknown>>
): PreviewMappingsProperties {
  // Identify missing mappings
  const missingMappings = difference(
    // Create an array of unique flattened field names across all docs
    [...new Set(docs.flatMap(Object.keys))],
    Object.keys(populatedProperties)
  );
  return {
    ...populatedProperties,
    ...missingMappings.reduce((acc, curr) => {
      const sampleDoc = docs.find((d) => typeof d[curr] !== 'undefined') ?? {};
      acc[curr] = { type: typeof sampleDoc[curr] as ES_FIELD_TYPES };
      return acc;
    }, {} as PreviewMappingsProperties),
  };
}

export const useTransformConfigData = (
  dataView: SearchItems['dataView'],
  query: TransformConfigQuery,
  validationStatus: StepDefineExposedState['validationStatus'],
  requestPayload: StepDefineExposedState['previewRequest'],
  combinedRuntimeMappings?: StepDefineExposedState['runtimeMappings'],
  timeRangeMs?: StepDefineExposedState['timeRangeMs']
): UseIndexDataReturnType => {
  const [previewMappingsProperties, setPreviewMappingsProperties] =
    useState<PreviewMappingsProperties>({});

  // Filters mapping properties of type `object`, which get returned for nested field parents.
  const columnKeys = Object.keys(previewMappingsProperties).filter(
    (key) => previewMappingsProperties[key].type !== 'object'
  );

  if (isPivotPartialRequest(requestPayload)) {
    const groupByArr = Object.keys(requestPayload.pivot.group_by);
    columnKeys.sort(sortColumns(groupByArr));
  } else if (isLatestPartialRequest(requestPayload)) {
    columnKeys.sort(sortColumnsForLatest(requestPayload.latest.sort));
  }

  // EuiDataGrid State
  const columns: EuiDataGridColumn[] = columnKeys.map((id) => {
    const field = previewMappingsProperties[id];
    const schema = getDataGridSchemaFromESFieldType(field?.type);

    return { id, schema };
  });

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    resetPagination,
    setErrorMessage,
    setNoDataMessage,
    setRowCountInfo,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  const previewRequest = useMemo(
    () =>
      getPreviewTransformRequestBody(
        dataView,
        query,
        requestPayload,
        combinedRuntimeMappings,
        timeRangeMs
      ),
    [dataView, query, requestPayload, combinedRuntimeMappings, timeRangeMs]
  );

  const {
    error: previewError,
    data: previewData,
    isError,
    isLoading,
  } = useGetTransformsPreview(previewRequest, validationStatus.isValid);

  useEffect(() => {
    if (isLoading) {
      setErrorMessage('');
      setNoDataMessage('');
      setStatus(INDEX_STATUS.LOADING);
    } else if (isError) {
      setErrorMessage(getErrorMessage(previewError));
      setTableItems([]);
      setRowCountInfo({
        rowCount: 0,
        rowCountRelation: ES_CLIENT_TOTAL_HITS_RELATION.EQ,
      });
      setPreviewMappingsProperties({});
      setStatus(INDEX_STATUS.ERROR);
    } else if (!isLoading && !isError && previewData !== undefined) {
      // To improve UI performance with a latest configuration for indices with a large number
      // of fields, we reduce the number of available columns to those populated with values.

      // 1. Flatten the returned object structure object documents to match mapping properties
      const docs = previewData.preview.map(getFlattenedObject);

      // 2. Get all field names for each returned doc and flatten it
      //    to a list of unique field names used across all docs.
      const populatedFields = [...new Set(docs.map(Object.keys).flat(1))];

      // 3. Filter mapping properties by populated fields
      let populatedProperties: PreviewMappingsProperties = Object.entries(
        previewData.generated_dest_index.mappings.properties
      )
        .filter(([key]) => populatedFields.includes(key))
        .reduce(
          (p, [key, value]) => ({
            ...p,
            [key]: value,
          }),
          {}
        );

      populatedProperties = getCombinedProperties(populatedProperties, docs);

      setTableItems(docs);
      setRowCountInfo({
        rowCount: docs.length,
        rowCountRelation: ES_CLIENT_TOTAL_HITS_RELATION.EQ,
      });
      setPreviewMappingsProperties(populatedProperties);
      setStatus(INDEX_STATUS.LOADED);

      if (docs.length === 0) {
        setNoDataMessage(
          i18n.translate('xpack.transform.pivotPreview.PivotPreviewNoDataCalloutBody', {
            defaultMessage:
              'The preview request did not return any data. Please ensure the optional query returns data and that values exist for the field used by group-by and aggregation fields.',
          })
        );
      } else {
        setNoDataMessage('');
      }
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, isLoading, previewData]);

  useEffect(() => {
    if (!validationStatus.isValid) {
      setTableItems([]);
      setRowCountInfo({
        rowCount: 0,
        rowCountRelation: ES_CLIENT_TOTAL_HITS_RELATION.EQ,
      });
      setNoDataMessage(validationStatus.errorMessage!);
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationStatus.isValid]);

  useEffect(() => {
    resetPagination();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  if (sortingColumns.length > 0) {
    const sortingColumnsWithTypes = sortingColumns.map((c) => {
      // Since items might contain undefined/null values, we want to accurate find the data type
      const populatedItem = tableItems.find(
        (item) => getNestedOrEscapedVal(item, c.id) !== undefined
      );

      return {
        ...c,
        type: typeof getNestedOrEscapedVal(populatedItem, c.id),
      };
    });
    tableItems.sort(multiColumnSortFactory(sortingColumnsWithTypes));
  }

  const pageData = tableItems.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const renderCellValue: RenderCellValue = useMemo(() => {
    return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const cellValue = pageData.hasOwnProperty(adjustedRowIndex)
        ? pageData[adjustedRowIndex][columnId] ?? null
        : null;

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      if (
        [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS].includes(
          previewMappingsProperties[columnId].type
        )
      ) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (previewMappingsProperties[columnId].type === ES_FIELD_TYPES.BOOLEAN) {
        return cellValue ? 'true' : 'false';
      }

      return cellValue;
    };
  }, [pageData, pagination.pageIndex, pagination.pageSize, previewMappingsProperties]);

  return {
    ...dataGrid,
    chartsButtonVisible: false,
    renderCellValue,
  };
};
