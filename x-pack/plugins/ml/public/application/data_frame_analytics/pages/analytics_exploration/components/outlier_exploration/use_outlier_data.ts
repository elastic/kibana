/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { EuiDataGridColumn } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import {
  ML__ID_COPY,
  ML__INCREMENTAL_ID,
  FEATURE_INFLUENCE,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';
import {
  getFieldType,
  showDataGridColumnChartErrorMessageToast,
  type UseIndexDataReturnType,
} from '@kbn/ml-data-grid';

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataLoader } from '../../../../../datavisualizer/index_based/data_loader';
import { getToastNotifications } from '../../../../../util/dependency_cache';

import { getIndexData } from '../../../../common';

import { getOutlierScoreFieldName } from './common';
import { useExplorationDataGrid } from '../exploration_results_table/use_exploration_data_grid';

export const useOutlierData = (
  indexPattern: DataView | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: estypes.QueryDslQueryContainer,
  columns: EuiDataGridColumn[]
): Omit<UseIndexDataReturnType, 'renderCellValue'> => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataGrid.chartsVisible,
    jobConfig?.dest.index,
    // Only trigger when search or the visible columns changes.
    // We're only interested in the visible columns but not their order, that's
    // why we sort for comparison (and copying it via spread to avoid sort in place).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([searchQuery, [...dataGrid.visibleColumns].sort()]),
  ]);

  return dataGrid;
};
