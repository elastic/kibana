/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import {
  isClassificationEvaluateResponse,
  ConfusionMatrix,
  ResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';
import { isKeywordAndTextType } from '../../../../common/fields';

import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  loadDocsCount,
  DataFrameAnalyticsConfig,
} from '../../../../common';

import { isTrainingFilter } from './is_training_filter';

export const useConfusionMatrix = (
  jobConfig: DataFrameAnalyticsConfig,
  searchQuery: ResultsSearchQuery
) => {
  const [confusionMatrixData, setConfusionMatrixData] = useState<ConfusionMatrix[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState<null | number>(null);
  const [avgRecall, setAvgRecall] = useState<null | number>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [docsCount, setDocsCount] = useState<null | number>(null);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    async function loadConfusionMatrixData() {
      setIsLoading(true);

      let requiresKeyword = false;
      const dependentVariable = getDependentVar(jobConfig.analysis);
      const resultsField = jobConfig.dest.results_field;
      const isTraining = isTrainingFilter(searchQuery, resultsField);

      try {
        requiresKeyword = isKeywordAndTextType(dependentVariable);
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
  }, [JSON.stringify([jobConfig, searchQuery])]);

  return { avgRecall, confusionMatrixData, docsCount, error, isLoading, overallAccuracy };
};
