/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import type { EuiDataGridColumn } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import {
  sortExplorationResultsFields,
  ML__ID_COPY,
  ML__INCREMENTAL_ID,
  DEFAULT_RESULTS_FIELD,
  FEATURE_INFLUENCE,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';
import {
  getFieldType,
  getDataGridSchemasFromFieldTypes,
  showDataGridColumnChartErrorMessageToast,
  useRenderCellValue,
  type UseIndexDataReturnType,
} from '@kbn/ml-data-grid';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DataLoader } from '../../../../../datavisualizer/index_based/data_loader';
import {
  useColorRange,
  COLOR_RANGE,
  COLOR_RANGE_SCALE,
} from '../../../../../components/color_range_legend';
import { useMlApiContext, useMlKibana } from '../../../../../contexts/kibana';

import { getIndexData, getIndexFields } from '../../../../common';

import { getFeatureCount, getOutlierScoreFieldName } from './common';
import { useExplorationDataGrid } from '../exploration_results_table/use_exploration_data_grid';

export const useOutlierData = (
  dataView: DataView | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: estypes.QueryDslQueryContainer
): UseIndexDataReturnType => {
  const {
    services: {
      notifications: { toasts },
    },
  } = useMlKibana();
  const ml = useMlApiContext();
  const needsDestIndexFields =
    dataView !== undefined && dataView.title === jobConfig?.source.index[0];

  const columns = useMemo(() => {
    const newColumns: EuiDataGridColumn[] = [];

    if (jobConfig !== undefined && dataView !== undefined) {
      const resultsField = jobConfig.dest.results_field;
      const { fieldTypes } = getIndexFields(ml, jobConfig, needsDestIndexFields);
      newColumns.push(
        ...getDataGridSchemasFromFieldTypes(fieldTypes, resultsField!).sort((a: any, b: any) =>
          sortExplorationResultsFields(a.id, b.id, jobConfig)
        )
      );
    }

    return newColumns;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig, dataView]);

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
    getIndexData(ml, jobConfig, dataGrid, searchQuery, options);
    return () => {
      options.didCancel = true;
    };
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig && jobConfig.id, dataGrid.pagination, searchQuery, dataGrid.sortingColumns]);

  const dataLoader = useMemo(
    () => (dataView !== undefined ? new DataLoader(dataView, ml) : undefined),
    // skip ml API services from deps check
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataView]
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
      showDataGridColumnChartErrorMessageToast(e, toasts);
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

  const colorRange = useColorRange(
    COLOR_RANGE.BLUE,
    COLOR_RANGE_SCALE.INFLUENCER,
    jobConfig !== undefined
      ? getFeatureCount(jobConfig.dest.results_field!, dataGrid.tableItems)
      : 1
  );

  const renderCellValue = useRenderCellValue(
    dataView,
    dataGrid.pagination,
    dataGrid.tableItems,
    jobConfig?.dest.results_field ?? DEFAULT_RESULTS_FIELD,
    (columnId, cellValue, fullItem, setCellProps) => {
      const resultsField = jobConfig?.dest.results_field ?? '';
      let backgroundColor: string | undefined;

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

      // From EUI docs: Treated as React component allowing hooks, context, and other React concepts to be used.
      // This is the recommended use of setCellProps: https://github.com/elastic/eui/blob/main/src/components/datagrid/data_grid_types.ts#L521-L525
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        if (backgroundColor) {
          setCellProps({
            style: { backgroundColor: String(backgroundColor) },
          });
        }
      }, [backgroundColor, setCellProps]);
    }
  );

  return {
    ...dataGrid,
    renderCellValue,
  };
};
