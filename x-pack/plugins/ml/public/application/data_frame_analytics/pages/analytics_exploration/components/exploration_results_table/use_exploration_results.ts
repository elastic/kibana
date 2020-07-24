/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useMemo } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import { CoreSetup } from 'src/core/public';

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

import { DataLoader } from '../../../../../datavisualizer/index_based/data_loader';

import {
  getDataGridSchemasFromFieldTypes,
  getFieldType,
  showDataGridColumnChartErrorMessageToast,
  useDataGrid,
  useRenderCellValue,
  UseIndexDataReturnType,
} from '../../../../../components/data_grid';
import { SavedSearchQuery } from '../../../../../contexts/ml';

import { getIndexData, getIndexFields, DataFrameAnalyticsConfig } from '../../../../common';
import {
  DEFAULT_RESULTS_FIELD,
  FEATURE_IMPORTANCE,
  TOP_CLASSES,
} from '../../../../common/constants';
import { sortExplorationResultsFields, ML__ID_COPY } from '../../../../common/fields';

export const useExplorationResults = (
  indexPattern: IndexPattern | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: SavedSearchQuery,
  toastNotifications: CoreSetup['notifications']['toasts']
): UseIndexDataReturnType => {
  const needsDestIndexFields =
    indexPattern !== undefined && indexPattern.title === jobConfig?.source.index[0];

  const columns: EuiDataGridColumn[] = [];

  if (jobConfig !== undefined) {
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
    // by default, hide feature-importance and top-classes columns and the doc id copy
    (d) =>
      !d.includes(`.${FEATURE_IMPORTANCE}.`) && !d.includes(`.${TOP_CLASSES}.`) && d !== ML__ID_COPY
  );

  useEffect(() => {
    dataGrid.resetPagination();
  }, [JSON.stringify(searchQuery)]);

  useEffect(() => {
    getIndexData(jobConfig, dataGrid, searchQuery);
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig && jobConfig.id, dataGrid.pagination, searchQuery, dataGrid.sortingColumns]);

  const dataLoader = useMemo(
    () =>
      indexPattern !== undefined ? new DataLoader(indexPattern, toastNotifications) : undefined,
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
      showDataGridColumnChartErrorMessageToast(e, toastNotifications);
    }
  };

  useEffect(() => {
    if (dataGrid.chartsVisible) {
      fetchColumnChartsData();
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataGrid.chartsVisible,
    jobConfig?.dest.index,
    JSON.stringify([searchQuery, dataGrid.visibleColumns]),
  ]);

  const renderCellValue = useRenderCellValue(
    indexPattern,
    dataGrid.pagination,
    dataGrid.tableItems,
    jobConfig?.dest.results_field ?? DEFAULT_RESULTS_FIELD
  );

  return {
    ...dataGrid,
    renderCellValue,
  };
};
