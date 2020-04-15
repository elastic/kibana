/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo, useState } from 'react';
import { SearchResponse } from 'elasticsearch';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { Dictionary } from '../../../../../../../common/types/common';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { useDataGrid, UseIndexDataReturnType } from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { mlFieldFormatService } from '../../../../../services/field_format_service';
import { ml } from '../../../../../services/ml_api_service';
import { getNestedProperty } from '../../../../../util/object_utils';

import {
  getDefaultSelectableFields,
  getFlattenedFields,
  DataFrameAnalyticsConfig,
  EsFieldName,
  INDEX_STATUS,
  MAX_COLUMNS,
  sortColumns,
} from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import { getOutlierScoreFieldName, OUTLIER_SCORE } from './common';

const FEATURE_INFLUENCE = 'feature_influence';

export type TableItem = Record<string, any>;

type EsSorting = Dictionary<{
  order: 'asc' | 'desc';
}>;

// The types specified in `@types/elasticsearch` are out of date and still have `total: number`.
interface SearchResponse7 extends SearchResponse<any> {
  hits: SearchResponse<any>['hits'] & {
    total: {
      value: number;
      relation: string;
    };
  };
}

const getFeatureCount = (resultsField: string, tableItems: TableItem[] = []) => {
  if (tableItems.length === 0) {
    return 0;
  }

  return Object.keys(tableItems[0]).filter(key =>
    key.includes(`${resultsField}.${FEATURE_INFLUENCE}.`)
  ).length;
};

export const useOutlierData = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery
): UseIndexDataReturnType => {
  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [tableFields, setTableFields] = useState<string[]>([]);
  const [tableItems, setTableItems] = useState<TableItem[]>([]);

  const columns = [];

  if (
    jobConfig !== undefined &&
    indexPattern !== undefined &&
    selectedFields.length > 0 &&
    tableItems.length > 0
  ) {
    const resultsField = jobConfig.dest.results_field;
    const removePrefix = new RegExp(`^${resultsField}\.${FEATURE_INFLUENCE}\.`, 'g');
    columns.push(
      ...tableFields.sort(sortColumns(tableItems[0], resultsField)).map(id => {
        const idWithoutPrefix = id.replace(removePrefix, '');
        const field = indexPattern.fields.getByName(idWithoutPrefix);

        // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
        // To fall back to the default string schema it needs to be undefined.
        let schema;

        switch (field?.type) {
          case 'date':
            schema = 'datetime';
            break;
          case 'geo_point':
            schema = 'json';
            break;
          case 'number':
            schema = 'numeric';
            break;
        }

        if (id === `${resultsField}.${OUTLIER_SCORE}`) {
          schema = 'numeric';
        }

        return { id, schema };
      })
    );
  }

  const dataGrid = useDataGrid(columns);

  const {
    pagination,
    rowCount,
    setErrorMessage,
    setRowCount,
    setSortingColumns,
    setStatus,
    sortingColumns,
    tableItems: dataGridTableItems,
  } = dataGrid;

  useEffect(() => {
    setTableItems(dataGridTableItems);
  }, [dataGridTableItems]);

  // initialize sorting: reverse sort on outlier score column
  useEffect(() => {
    if (jobConfig !== undefined) {
      setSortingColumns([{ id: getOutlierScoreFieldName(jobConfig), direction: 'desc' }]);
    }
  }, [jobConfig && jobConfig.id]);

  // update data grid data
  useEffect(() => {
    (async () => {
      if (jobConfig !== undefined) {
        setErrorMessage('');
        setStatus(INDEX_STATUS.LOADING);

        try {
          const resultsField = jobConfig.dest.results_field;

          const sort: EsSorting = sortingColumns
            .map(column => {
              const { id } = column;
              column.id = isKeywordAndTextType(id) ? `${id}.keyword` : id;
              return column;
            })
            .reduce((s, column) => {
              s[column.id] = { order: column.direction };
              return s;
            }, {} as EsSorting);

          const { pageIndex, pageSize } = pagination;
          const resp: SearchResponse7 = await ml.esSearch({
            index: jobConfig.dest.index,
            body: {
              query: searchQuery,
              from: pageIndex * pageSize,
              size: pageSize,
              ...(Object.keys(sort).length > 0 ? { sort } : {}),
            },
          });

          setRowCount(resp.hits.total.value);

          const docs = resp.hits.hits;

          if (docs.length === 0) {
            setTableItems([]);
            setStatus(INDEX_STATUS.LOADED);
            return;
          }

          if (selectedFields.length === 0) {
            const newSelectedFields = getDefaultSelectableFields(docs, resultsField);
            setSelectedFields(newSelectedFields.sort().splice(0, MAX_COLUMNS));
          }

          // Create a version of the doc's source with flattened field names.
          // This avoids confusion later on if a field name has dots in its name
          // or is a nested fields when displaying it via EuiInMemoryTable.
          const flattenedFields = getFlattenedFields(docs[0]._source, resultsField);
          const transformedTableItems = docs.map(doc => {
            const item: TableItem = {};
            flattenedFields.forEach(ff => {
              item[ff] = getNestedProperty(doc._source, ff);
              if (item[ff] === undefined) {
                // If the attribute is undefined, it means it was not a nested property
                // but had dots in its actual name. This selects the property by its
                // full name and assigns it to `item[ff]`.
                item[ff] = doc._source[`"${ff}"`];
              }
              if (item[ff] === undefined) {
                const parts = ff.split('.');
                if (parts[0] === resultsField && parts.length >= 2) {
                  parts.shift();
                  if (doc._source[resultsField] !== undefined) {
                    item[ff] = doc._source[resultsField][parts.join('.')];
                  }
                }
              }
            });
            return item;
          });

          setTableFields(flattenedFields);
          setTableItems(transformedTableItems);
          setStatus(INDEX_STATUS.LOADED);
        } catch (e) {
          if (e.message !== undefined) {
            setErrorMessage(e.message);
          } else {
            setErrorMessage(JSON.stringify(e));
          }
          setTableItems([]);
          setStatus(INDEX_STATUS.ERROR);
        }
      }
    })();
  }, [jobConfig && jobConfig.id, pagination, searchQuery, selectedFields, sortingColumns]);

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  const renderCellValue = useMemo(() => {
    const resultsField = jobConfig?.dest.results_field ?? '';

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

      const fullItem = tableItems[adjustedRowIndex];

      if (fullItem === undefined) {
        return null;
      }

      let format: any;

      if (indexPattern !== undefined) {
        format = mlFieldFormatService.getFieldFormatFromIndexPattern(indexPattern, columnId, '');
      }

      const cellValue =
        fullItem.hasOwnProperty(columnId) && fullItem[columnId] !== undefined
          ? fullItem[columnId]
          : null;

      const split = columnId.split('.');
      let backgroundColor;

      // column with feature values get color coded by its corresponding influencer value
      if (fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`] !== undefined) {
        backgroundColor = colorRange(fullItem[`${resultsField}.${FEATURE_INFLUENCE}.${columnId}`]);
      }

      // column with influencer values get color coded by its own value
      if (split.length > 2 && split[0] === resultsField && split[1] === FEATURE_INFLUENCE) {
        backgroundColor = colorRange(cellValue);
      }

      if (backgroundColor !== undefined) {
        setCellProps({
          style: { backgroundColor },
        });
      }

      if (format !== undefined) {
        return format.convert(cellValue, 'text');
      }

      if (typeof cellValue === 'string' || cellValue === null) {
        return cellValue;
      }

      if (typeof cellValue === 'boolean') {
        return cellValue ? 'true' : 'false';
      }

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      return cellValue;
    };
  }, [jobConfig, rowCount, tableItems, pagination.pageIndex, pagination.pageSize]);

  return {
    columns,
    errorMessage: dataGrid.errorMessage,
    invalidSortingColumnns: dataGrid.invalidSortingColumnns,
    onChangeItemsPerPage: dataGrid.onChangeItemsPerPage,
    onChangePage: dataGrid.onChangePage,
    onSort: dataGrid.onSort,
    noDataMessage: '',
    pagination,
    setPagination: dataGrid.setPagination,
    setVisibleColumns: dataGrid.setVisibleColumns,
    renderCellValue,
    rowCount,
    sortingColumns,
    status: dataGrid.status,
    tableItems,
    visibleColumns: dataGrid.visibleColumns,
  };
};
