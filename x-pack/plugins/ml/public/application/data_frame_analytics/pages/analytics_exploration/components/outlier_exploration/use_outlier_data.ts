/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import {
  getDataGridSchemasFromFieldTypes,
  useDataGrid,
  useRenderCellValue,
  UseIndexDataReturnType,
} from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';

import { getIndexData, getIndexFields, DataFrameAnalyticsConfig } from '../../../../common';
import { DEFAULT_RESULTS_FIELD, FEATURE_INFLUENCE } from '../../../../common/constants';
import { sortExplorationResultsFields, ML__ID_COPY } from '../../../../common/fields';

import { getFeatureCount, getOutlierScoreFieldName } from './common';

export const useOutlierData = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery
): UseIndexDataReturnType => {
  const needsDestIndexFields =
    indexPattern !== undefined && indexPattern.title === jobConfig?.source.index[0];

  const columns: EuiDataGridColumn[] = [];

  if (jobConfig !== undefined && indexPattern !== undefined) {
    const resultsField = jobConfig.dest.results_field;
    const { fieldTypes } = getIndexFields(jobConfig, needsDestIndexFields);
    columns.push(
      ...getDataGridSchemasFromFieldTypes(fieldTypes, resultsField).sort((a: any, b: any) =>
        sortExplorationResultsFields(a.id, b.id, jobConfig)
      )
    );
  }

  const dataGrid = useDataGrid(
    columns,
    25,
    // reduce default selected rows from 20 to 8 for performance reasons.
    8,
    // by default, hide feature-influence columns and the doc id copy
    d => !d.includes(`.${FEATURE_INFLUENCE}.`) && d !== ML__ID_COPY
  );

  // initialize sorting: reverse sort on outlier score column
  useEffect(() => {
    if (jobConfig !== undefined) {
      dataGrid.setSortingColumns([{ id: getOutlierScoreFieldName(jobConfig), direction: 'desc' }]);
    }
  }, [jobConfig && jobConfig.id]);

  useEffect(() => {
    getIndexData(jobConfig, dataGrid, searchQuery);
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig && jobConfig.id, dataGrid.pagination, searchQuery, dataGrid.sortingColumns]);

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined ? getFeatureCount(jobConfig.dest.results_field, dataGrid.tableItems) : 1
  );

  const renderCellValue = useRenderCellValue(
    indexPattern,
    dataGrid.pagination,
    dataGrid.tableItems,
    jobConfig?.dest.results_field ?? DEFAULT_RESULTS_FIELD,
    (columnId, cellValue, fullItem, setCellProps) => {
      const resultsField = jobConfig?.dest.results_field ?? '';

      const split = columnId.split('.');
      let backgroundColor;

      // column with feature values get color coded by its corresponding influencer value
      if (
        fullItem[resultsField] !== undefined &&
        fullItem[resultsField][`${FEATURE_INFLUENCE}.${columnId}`] !== undefined
      ) {
        backgroundColor = colorRange(fullItem[resultsField][`${FEATURE_INFLUENCE}.${columnId}`]);
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
    ...dataGrid,
    columns,
    renderCellValue,
  };
};
