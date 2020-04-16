/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { getErrorMessage } from '../../../../../../../common/util/errors';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import {
  getDataGridSchemaFromKibanaFieldType,
  getFieldsFromKibanaIndexPattern,
  useDataGrid,
  useRenderCellValue,
  EsSorting,
  SearchResponse7,
  UseIndexDataReturnType,
} from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';
import { ml } from '../../../../../services/ml_api_service';

import { DataFrameAnalyticsConfig, INDEX_STATUS } from '../../../../common';
import { isKeywordAndTextType } from '../../../../common/fields';

import {
  getFeatureCount,
  getOutlierScoreFieldName,
  FEATURE_INFLUENCE,
  OUTLIER_SCORE,
} from './common';

export const useOutlierData = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery
): UseIndexDataReturnType => {
  // EuiDataGrid State
  const columns = [];

  if (jobConfig !== undefined && indexPattern !== undefined) {
    const indexPatternFields = getFieldsFromKibanaIndexPattern(indexPattern);
    const resultsField = jobConfig.dest.results_field;
    const removePrefix = new RegExp(`^${resultsField}\.${FEATURE_INFLUENCE}\.`, 'g');
    columns.push(
      ...indexPatternFields.map(id => {
        const idWithoutPrefix = id.replace(removePrefix, '');
        const field = indexPattern.fields.getByName(idWithoutPrefix);
        let schema = getDataGridSchemaFromKibanaFieldType(field);

        if (id === `${resultsField}.${OUTLIER_SCORE}`) {
          schema = 'numeric';
        }

        return { id, schema };
      })
    );
  }

  const dataGrid = useDataGrid(columns, 25);

  const {
    pagination,
    rowCount,
    setErrorMessage,
    setRowCount,
    setSortingColumns,
    setStatus,
    setTableItems,
    sortingColumns,
    tableItems,
  } = dataGrid;

  // initialize sorting: reverse sort on outlier score column
  useEffect(() => {
    if (jobConfig !== undefined) {
      setSortingColumns([{ id: getOutlierScoreFieldName(jobConfig), direction: 'desc' }]);
    }
  }, [jobConfig && jobConfig.id]);

  // update data grid data
  const getIndexData = async () => {
    if (jobConfig !== undefined) {
      setErrorMessage('');
      setStatus(INDEX_STATUS.LOADING);

      try {
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

        const docs = resp.hits.hits.map(d => d._source);

        setTableItems(docs);
        setStatus(INDEX_STATUS.LOADED);
      } catch (e) {
        setErrorMessage(getErrorMessage(e));
        setStatus(INDEX_STATUS.ERROR);
      }
    }
  };

  useEffect(() => {
    getIndexData();
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig && jobConfig.id, pagination, searchQuery, sortingColumns]);

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, tableItems) : 1
  );

  const renderCellValue = useRenderCellValue(
    indexPattern,
    pagination,
    tableItems,
    (columnId, cellValue, fullItem, setCellProps) => {
      const resultsField = jobConfig?.dest.results_field ?? '';

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
    }
  );

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
