/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import {
  getDependentVar,
  getPredictionFieldName,
  ANALYSIS_CONFIG_TYPE,
  type ClassificationEvaluateResponse,
  type ConfusionMatrix,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';

import { newJobCapsServiceAnalytics } from '../../../../../services/new_job_capabilities/new_job_capabilities_service_analytics';

import type { ResultsSearchQuery, ClassificationMetricItem } from '../../../../common/analytics';
import { isClassificationEvaluateResponse } from '../../../../common/analytics';

import { loadEvalData, loadDocsCount } from '../../../../common';

import { isTrainingFilter } from './is_training_filter';

function getEvalutionMetricsItems(evalMetrics?: ClassificationEvaluateResponse['classification']) {
  if (evalMetrics === undefined) return [];

  const accuracyMetrics = evalMetrics.accuracy?.classes || [];
  const recallMetrics = evalMetrics.recall?.classes || [];

  const metricsMap = accuracyMetrics.reduce((acc, accuracyMetric) => {
    acc[accuracyMetric.class_name] = {
      className: accuracyMetric.class_name,
      accuracy: accuracyMetric.value,
    };
    return acc;
  }, {} as Record<string, ClassificationMetricItem>);

  recallMetrics.forEach((recallMetric) => {
    if (metricsMap[recallMetric.class_name] !== undefined) {
      metricsMap[recallMetric.class_name] = {
        recall: recallMetric.value,
        ...metricsMap[recallMetric.class_name],
      };
    } else {
      metricsMap[recallMetric.class_name] = {
        className: recallMetric.class_name,
        recall: recallMetric.value,
      };
    }
  });

  return Object.values(metricsMap);
}

export const useConfusionMatrix = (
  jobConfig: DataFrameAnalyticsConfig,
  searchQuery: ResultsSearchQuery
) => {
  const [confusionMatrixData, setConfusionMatrixData] = useState<ConfusionMatrix[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState<null | number>(null);
  const [avgRecall, setAvgRecall] = useState<null | number>(null);
  const [evaluationMetricsItems, setEvaluationMetricsItems] = useState<ClassificationMetricItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [docsCount, setDocsCount] = useState<null | number>(null);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    async function loadConfusionMatrixData() {
      setIsLoading(true);

      let requiresKeyword = false;
      const dependentVariable = getDependentVar(jobConfig.analysis);
      const resultsField = jobConfig.dest.results_field!;
      const isTraining = isTrainingFilter(searchQuery, resultsField);

      try {
        requiresKeyword = newJobCapsServiceAnalytics.isKeywordAndTextType(dependentVariable);
      } catch (e) {
        // Additional error handling due to missing field type is handled by loadEvalData
        console.error('Unable to load new field types', e); // eslint-disable-line no-console
      }

      const evalData = await loadEvalData({
        isTraining,
        index: jobConfig.dest.index,
        dependentVariable,
        resultsField,
        predictionFieldName: getPredictionFieldName(jobConfig.analysis),
        searchQuery,
        jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
        requiresKeyword,
      });

      const docsCountResp = await loadDocsCount({
        isTraining,
        searchQuery,
        resultsField,
        destIndex: jobConfig.dest.index,
      });

      if (
        evalData.success === true &&
        evalData.eval &&
        isClassificationEvaluateResponse(evalData.eval)
      ) {
        const confusionMatrix =
          evalData.eval?.classification?.multiclass_confusion_matrix?.confusion_matrix;
        setError(null);
        setConfusionMatrixData(confusionMatrix || []);
        setAvgRecall(evalData.eval?.classification?.recall?.avg_recall || null);
        setOverallAccuracy(evalData.eval?.classification?.accuracy?.overall_accuracy || null);
        setEvaluationMetricsItems(getEvalutionMetricsItems(evalData.eval?.classification));
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setConfusionMatrixData([]);
        setError(evalData.error);
      }

      if (docsCountResp.success === true) {
        setDocsCount(docsCountResp.docsCount);
      } else {
        setDocsCount(null);
      }
    }

    loadConfusionMatrixData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([jobConfig, searchQuery])]);

  return {
    avgRecall,
    confusionMatrixData,
    docsCount,
    error,
    isLoading,
    overallAccuracy,
    evaluationMetricsItems,
  };
};
