/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { useEffect, useMemo, useState } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/common';

import { dictionaryToArray } from '../../../common/types/common';
import { formatHumanReadableDateTimeSeconds } from '../../shared_imports';
import { getNestedProperty } from '../../../common/utils/object_utils';

import {
  getErrorMessage,
  multiColumnSortFactory,
  useDataGrid,
  RenderCellValue,
  UseIndexDataReturnType,
  INDEX_STATUS,
} from '../../shared_imports';

import {
  getPreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotGroupByConfig,
  PivotQuery,
  PreviewMappings,
  PivotAggsConfig,
} from '../common';

import { SearchItems } from './use_search_items';
import { useApi } from './use_api';
import { isPivotAggsWithExtendedForm } from '../common/pivot_aggs';

/**
 * Checks if the aggregations collection is invalid.
 */
function isConfigInvalid(aggsArray: PivotAggsConfig[]): boolean {
  return aggsArray.some((agg) => {
    return (
      (isPivotAggsWithExtendedForm(agg) && !agg.isValid()) ||
      (agg.subAggs && isConfigInvalid(Object.values(agg.subAggs)))
    );
  });
}

function sortColumns(groupByArr: PivotGroupByConfig[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some((d) => d.aggName === a) && groupByArr.some((d) => d.aggName === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some((d) => d.aggName === a)) {
      return -1;
    }
    if (groupByArr.some((d) => d.aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

export const usePivotData = (
  indexPatternTitle: SearchItems['indexPattern']['title'],
  query: PivotQuery,
  aggs: PivotAggsConfigDict,
  groupBy: PivotGroupByConfigDict
): UseIndexDataReturnType => {
  const [previewMappings, setPreviewMappings] = useState<PreviewMappings>({ properties: {} });
  const api = useApi();

  const aggsArr = useMemo(() => dictionaryToArray(aggs), [aggs]);
  const groupByArr = useMemo(() => dictionaryToArray(groupBy), [groupBy]);

  // Filters mapping properties of type `object`, which get returned for nested field parents.
  const columnKeys = Object.keys(previewMappings.properties).filter(
    (key) => previewMappings.properties[key].type !== 'object'
  );
  columnKeys.sort(sortColumns(groupByArr));

  // EuiDataGrid State
  const columns: EuiDataGridColumn[] = columnKeys.map((id) => {
    const field = previewMappings.properties[id];

    // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
    // To fall back to the default string schema it needs to be undefined.
    let schema;

    switch (field?.type) {
      case ES_FIELD_TYPES.GEO_POINT:
      case ES_FIELD_TYPES.GEO_SHAPE:
        schema = 'json';
        break;
      case ES_FIELD_TYPES.BOOLEAN:
        schema = 'boolean';
        break;
      case ES_FIELD_TYPES.DATE:
      case ES_FIELD_TYPES.DATE_NANOS:
        schema = 'datetime';
        break;
      case ES_FIELD_TYPES.BYTE:
      case ES_FIELD_TYPES.DOUBLE:
      case ES_FIELD_TYPES.FLOAT:
      case ES_FIELD_TYPES.HALF_FLOAT:
      case ES_FIELD_TYPES.INTEGER:
      case ES_FIELD_TYPES.LONG:
      case ES_FIELD_TYPES.SCALED_FLOAT:
      case ES_FIELD_TYPES.SHORT:
        schema = 'numeric';
        break;
      // keep schema undefined for text based columns
      case ES_FIELD_TYPES.KEYWORD:
      case ES_FIELD_TYPES.TEXT:
        break;
    }

    return { id, schema };
  });

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    resetPagination,
    setErrorMessage,
    setNoDataMessage,
    setRowCount,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  const getPreviewData = async () => {
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      setTableItems([]);
      setRowCount(0);
      setNoDataMessage(
        i18n.translate('xpack.transform.pivotPreview.PivotPreviewIncompleteConfigCalloutBody', {
          defaultMessage: 'Please choose at least one group-by field and aggregation.',
        })
      );
      return;
    }

    if (isConfigInvalid(aggsArr)) {
      return;
    }

    setErrorMessage('');
    setNoDataMessage('');
    setStatus(INDEX_STATUS.LOADING);

    try {
      const previewRequest = getPreviewRequestBody(indexPatternTitle, query, groupByArr, aggsArr);
      const resp = await api.getTransformsPreview(previewRequest);
      setTableItems(resp.preview);
      setRowCount(resp.preview.length);
      setPreviewMappings(resp.generated_dest_index.mappings);
      setStatus(INDEX_STATUS.LOADED);

      if (resp.preview.length === 0) {
        setNoDataMessage(
          i18n.translate('xpack.transform.pivotPreview.PivotPreviewNoDataCalloutBody', {
            defaultMessage:
              'The preview request did not return any data. Please ensure the optional query returns data and that values exist for the field used by group-by and aggregation fields.',
          })
        );
      }
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
      setTableItems([]);
      setRowCount(0);
      setPreviewMappings({ properties: {} });
      setStatus(INDEX_STATUS.ERROR);
    }
  };

  useEffect(() => {
    resetPagination();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query)]);

  useEffect(() => {
    getPreviewData();
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    indexPatternTitle,
    aggsArr,
    JSON.stringify([groupByArr, query]),
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  if (sortingColumns.length > 0) {
    tableItems.sort(multiColumnSortFactory(sortingColumns));
  }

  const pageData = tableItems.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  const renderCellValue: RenderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const cellValue = pageData.hasOwnProperty(adjustedRowIndex)
        ? getNestedProperty(pageData[adjustedRowIndex], columnId, null)
        : null;

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      if (
        [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS].includes(
          previewMappings.properties[columnId].type
        )
      ) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (previewMappings.properties[columnId].type === ES_FIELD_TYPES.BOOLEAN) {
        return cellValue ? 'true' : 'false';
      }

      return cellValue;
    };
  }, [pageData, pagination.pageIndex, pagination.pageSize, previewMappings.properties]);

  return {
    ...dataGrid,
    chartsButtonVisible: false,
    renderCellValue,
  };
};
