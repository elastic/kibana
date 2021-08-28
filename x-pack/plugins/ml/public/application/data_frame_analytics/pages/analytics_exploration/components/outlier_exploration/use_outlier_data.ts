/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridColumn } from '@elastic/eui';
import { useEffect, useMemo } from 'react';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { DEFAULT_RESULTS_FIELD } from '../../../../../../../common/constants/data_frame_analytics';
import type { DataFrameAnalyticsConfig } from '../../../../../../../common/types/data_frame_analytics';
import {
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
  useColorRange,
} from '../../../../../components/color_range_legend/use_color_range';
import {
  getDataGridSchemasFromFieldTypes,
  showDataGridColumnChartErrorMessageToast,
  useRenderCellValue,
} from '../../../../../components/data_grid/common';
import type { UseIndexDataReturnType } from '../../../../../components/data_grid/types';
import { getFieldType } from '../../../../../components/data_grid/use_column_chart';
import type { SavedSearchQuery } from '../../../../../contexts/ml/ml_context';
import { DataLoader } from '../../../../../datavisualizer/index_based/data_loader/data_loader';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { FEATURE_INFLUENCE } from '../../../../common/constants';
import {
  ML__ID_COPY,
  ML__INCREMENTAL_ID,
  sortExplorationResultsFields,
} from '../../../../common/fields';
import { getIndexData } from '../../../../common/get_index_data';
import { getIndexFields } from '../../../../common/get_index_fields';
import { useExplorationDataGrid } from '../exploration_results_table/use_exploration_data_grid';
import { getFeatureCount, getOutlierScoreFieldName } from './common';

export const useOutlierData = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery
): UseIndexDataReturnType => {
  const needsDestIndexFields =
    indexPattern !== undefined && indexPattern.title === jobConfig?.source.index[0];

  const columns = useMemo(() => {
    const newColumns: EuiDataGridColumn[] = [];

    if (jobConfig !== undefined && indexPattern !== undefined) {
      const resultsField = jobConfig.dest.results_field;
      const { fieldTypes } = getIndexFields(jobConfig, needsDestIndexFields);
      newColumns.push(
        ...getDataGridSchemasFromFieldTypes(fieldTypes, resultsField).sort((a: any, b: any) =>
          sortExplorationResultsFields(a.id, b.id, jobConfig)
        )
      );
    }

    return newColumns;
  }, [jobConfig, indexPattern]);

  const dataGrid = useExplorationDataGrid(
    columns,
    // reduce default selected rows from 20 to 8 for performance reasons.
    8,
    // by default, hide feature-influence columns and the doc id copy
    (d) => !d.includes(`.${FEATURE_INFLUENCE}.`) && d !== ML__ID_COPY && d !== ML__INCREMENTAL_ID
  );

  // initialize sorting: reverse sort on outlier score column
  useEffect(() => {
    if (jobConfig !== undefined) {
      dataGrid.setSortingColumns([{ id: getOutlierScoreFieldName(jobConfig), direction: 'desc' }]);
    }
  }, [jobConfig && jobConfig.id]);

  // The pattern using `didCancel` allows us to abort out of date remote request.
  // We wrap `didCancel` in a object so we can mutate the value as it's being
  // passed on to `getIndexData`.
  useEffect(() => {
    const options = { didCancel: false };
    getIndexData(jobConfig, dataGrid, searchQuery, options);
    return () => {
      options.didCancel = true;
    };
    // custom comparison
  }, [jobConfig && jobConfig.id, dataGrid.pagination, searchQuery, dataGrid.sortingColumns]);

  const dataLoader = useMemo(
    () =>
      indexPattern !== undefined
        ? new DataLoader(indexPattern, getToastNotifications())
        : undefined,
    [indexPattern]
  );

  const fetchColumnChartsData = async function () {
    try {
      if (jobConfig !== undefined && dataLoader !== undefined) {
        const columnChartsData = await dataLoader.loadFieldHistograms(
          columns
            .filter((cT) => dataGrid.visibleColumns.includes(cT.id))
            .map((cT) => ({
              fieldName: cT.id,
              type: getFieldType(cT.schema),
            })),
          searchQuery
        );
        dataGrid.setColumnCharts(columnChartsData);
      }
    } catch (e) {
      showDataGridColumnChartErrorMessageToast(e, getToastNotifications());
    }
  };

  useEffect(() => {
    if (dataGrid.chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
  }, [
    dataGrid.chartsVisible,
    jobConfig?.dest.index,
    // Only trigger when search or the visible columns changes.
    // We're only interested in the visible columns but not their order, that's
    // why we sort for comparison (and copying it via spread to avoid sort in place).
    JSON.stringify([searchQuery, [...dataGrid.visibleColumns].sort()]),
  ]);

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
      let backgroundColor;

      const featureNames = fullItem[`${resultsField}.${FEATURE_INFLUENCE}`];

      // column with feature values get color coded by its corresponding influencer value
      if (Array.isArray(featureNames)) {
        const featureForColumn = featureNames.find(
          (feature) => columnId === feature.feature_name[0]
        );
        if (featureForColumn) {
          backgroundColor = colorRange(featureForColumn.influence[0]);
        }
      }

      if (backgroundColor !== undefined) {
        setCellProps({
          style: { backgroundColor: String(backgroundColor) },
        });
      }
    }
  );

  return {
    ...dataGrid,
    renderCellValue,
  };
};
