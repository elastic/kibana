/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { EuiDataGridColumn } from '@elastic/eui';

import type { CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import {
  getPredictionFieldName,
  getDefaultPredictionFieldName,
  isClassificationAnalysis,
  isRegressionAnalysis,
  sortExplorationResultsFields,
  DEFAULT_RESULTS_FIELD,
  FEATURE_IMPORTANCE,
  ML__ID_COPY,
  TOP_CLASSES,
  type DataFrameAnalyticsConfig,
  type FeatureImportanceBaseline,
} from '@kbn/ml-data-frame-analytics-utils';
import {
  getDataGridSchemasFromFieldTypes,
  getFieldType,
  showDataGridColumnChartErrorMessageToast,
  useRenderCellValue,
  type UseIndexDataReturnType,
} from '@kbn/ml-data-grid';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { MlApiServices } from '../../../../../services/ml_api_service';
import { DataLoader } from '../../../../../datavisualizer/index_based/data_loader';

import { getIndexData, getIndexFields } from '../../../../common';
import { useTrainedModelsApiService } from '../../../../../services/ml_api_service/trained_models';
import { useExplorationDataGrid } from './use_exploration_data_grid';

export const useExplorationResults = (
  dataView: DataView | undefined,
  jobConfig: DataFrameAnalyticsConfig | undefined,
  searchQuery: estypes.QueryDslQueryContainer,
  toastNotifications: CoreSetup['notifications']['toasts'],
  mlApiServices: MlApiServices
): UseIndexDataReturnType => {
  const [baseline, setBaseLine] = useState<FeatureImportanceBaseline | undefined>();

  const trainedModelsApiService = useTrainedModelsApiService();

  const needsDestIndexFields =
    dataView !== undefined && dataView.title === jobConfig?.source.index[0];

  const columns: EuiDataGridColumn[] = [];

  if (jobConfig !== undefined) {
    const resultsField = jobConfig.dest.results_field!;
    const { fieldTypes } = getIndexFields(jobConfig, needsDestIndexFields);
    columns.push(
      ...getDataGridSchemasFromFieldTypes(fieldTypes, resultsField).sort((a: any, b: any) =>
        sortExplorationResultsFields(a.id, b.id, jobConfig)
      )
    );
  }
  const dataGrid = useExplorationDataGrid(
    columns,
    // reduce default selected rows from 20 to 8 for performance reasons.
    8,
    // by default, hide feature-importance and top-classes columns and the doc id copy
    (d) =>
      !d.includes(`.${FEATURE_IMPORTANCE}.`) && !d.includes(`.${TOP_CLASSES}.`) && d !== ML__ID_COPY
  );

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
    () => (dataView !== undefined ? new DataLoader(dataView, toastNotifications) : undefined),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify([searchQuery, dataGrid.visibleColumns]),
  ]);
  const predictionFieldName = useMemo(() => {
    if (jobConfig) {
      return (
        getPredictionFieldName(jobConfig.analysis) ??
        getDefaultPredictionFieldName(jobConfig.analysis)
      );
    }
    return undefined;
  }, [jobConfig]);

  const getAnalyticsBaseline = useCallback(async () => {
    try {
      if (
        jobConfig !== undefined &&
        jobConfig.analysis !== undefined &&
        (isRegressionAnalysis(jobConfig.analysis) || isClassificationAnalysis(jobConfig.analysis))
      ) {
        const jobId = jobConfig.id;
        const inferenceModels = await trainedModelsApiService.getTrainedModels(`${jobId}*`, {
          include: 'feature_importance_baseline',
        });
        const inferenceModel = inferenceModels.find(
          (model) => model.metadata?.analytics_config?.id === jobId
        );

        if (inferenceModel?.metadata?.feature_importance_baseline !== undefined) {
          setBaseLine(inferenceModel?.metadata?.feature_importance_baseline);
        }
      }
    } catch (e) {
      const error = extractErrorMessage(e);

      toastNotifications.addDanger({
        title: i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.baselineErrorMessageToast',
          {
            defaultMessage: 'An error occurred getting feature importance baseline',
          }
        ),
        text: error,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mlApiServices, jobConfig]);

  useEffect(() => {
    getAnalyticsBaseline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobConfig]);

  const resultsField = jobConfig?.dest.results_field ?? DEFAULT_RESULTS_FIELD;
  const renderCellValue = useRenderCellValue(
    dataView,
    dataGrid.pagination,
    dataGrid.tableItems,
    resultsField
  );

  return {
    ...dataGrid,
    renderCellValue,
    baseline,
    predictionFieldName,
    resultsField,
  };
};
