/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import {
  isClassificationEvaluateResponse,
  AucRocCurveItem,
  ResultsSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';
import { isKeywordAndTextType } from '../../../../common/fields';

import {
  getDependentVar,
  getPredictionFieldName,
  loadEvalData,
  DataFrameAnalyticsConfig,
} from '../../../../common';

import { ACTUAL_CLASS_ID } from './column_data';

import { isTrainingFilter } from './is_training_filter';

interface AucRocDataRow extends AucRocCurveItem {
  class_name: string;
}

export const useAucRoc = (
  jobConfig: DataFrameAnalyticsConfig,
  searchQuery: ResultsSearchQuery,
  visibleColumns: string[]
) => {
  const classificationClasses = visibleColumns.filter((d) => d !== ACTUAL_CLASS_ID);

  const [aucRocData, setAucRocData] = useState<AucRocDataRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | string[]>(null);

  useEffect(() => {
    async function loadAucRocData() {
      setIsLoading(true);

      const dependentVariable = getDependentVar(jobConfig.analysis);
      const resultsField = jobConfig.dest.results_field;

      const newAucRocData: AucRocDataRow[] = [];

      let requiresKeyword = false;
      const errors: string[] = [];

      try {
        requiresKeyword = isKeywordAndTextType(dependentVariable);
      } catch (e) {
        // Additional error handling due to missing field type is handled by loadEvalData
        console.error('Unable to load new field types', e); // eslint-disable-line no-console
      }

      for (let i = 0; i < classificationClasses.length; i++) {
        const aucRocClassName = classificationClasses[i];
        const evalData = await loadEvalData({
          isTraining: isTrainingFilter(searchQuery, resultsField),
          index: jobConfig.dest.index,
          dependentVariable,
          resultsField,
          predictionFieldName: getPredictionFieldName(jobConfig.analysis),
          searchQuery,
          jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
          requiresKeyword,
          aucRocClassName,
          includeMulticlassConfusionMatrix: false,
        });

        if (
          evalData.success === true &&
          evalData.eval &&
          isClassificationEvaluateResponse(evalData.eval)
        ) {
          const aucRocDataForClass = (evalData.eval?.classification?.auc_roc?.curve || []).map(
            (d) => ({
              class_name: aucRocClassName,
              ...d,
            })
          );
          newAucRocData.push(...aucRocDataForClass);
        } else if (evalData.error !== null) {
          errors.push(evalData.error);
        }
      }

      setError(errors.length > 0 ? errors : null);
      setAucRocData(newAucRocData);
      setIsLoading(false);
    }

    loadAucRocData();
  }, [JSON.stringify([jobConfig, searchQuery, visibleColumns])]);

  return { aucRocData, classificationClasses, error, isLoading };
};
