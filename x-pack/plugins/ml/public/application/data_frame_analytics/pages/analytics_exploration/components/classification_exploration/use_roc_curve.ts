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
  type DataFrameAnalyticsConfig,
  type RocCurveItem,
} from '@kbn/ml-data-frame-analytics-utils';

import { newJobCapsServiceAnalytics } from '../../../../../services/new_job_capabilities/new_job_capabilities_service_analytics';

import type { ResultsSearchQuery } from '../../../../common/analytics';
import { isClassificationEvaluateResponse } from '../../../../common/analytics';
import { loadEvalData } from '../../../../common';

import { ACTUAL_CLASS_ID, OTHER_CLASS_ID } from './column_data';

import { isTrainingFilter } from './is_training_filter';

const AUC_VALUE_LABEL = 'AUC';
const AUC_ROUNDING_VALUE = 100000;
const ROC_CLASS_NAME = 'ROC';
const BINARY_CLASSIFICATION_THRESHOLD = 2;

interface RocCurveDataRow extends RocCurveItem {
  class_name: string;
}

export const useRocCurve = (
  jobConfig: DataFrameAnalyticsConfig,
  searchQuery: ResultsSearchQuery,
  columns: string[]
) => {
  const classificationClasses = columns.filter(
    (d) => d !== ACTUAL_CLASS_ID && d !== OTHER_CLASS_ID
  );

  // For binary classification jobs we only need to get the data for one class.
  if (classificationClasses.length <= BINARY_CLASSIFICATION_THRESHOLD) {
    classificationClasses.splice(1);
  }

  const [rocCurveData, setRocCurveData] = useState<RocCurveDataRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | string[]>(null);

  useEffect(() => {
    async function loadRocCurveData() {
      setIsLoading(true);

      const dependentVariable = getDependentVar(jobConfig.analysis);
      const resultsField = jobConfig.dest.results_field!;

      const newRocCurveData: RocCurveDataRow[] = [];

      let requiresKeyword = false;
      const errors: string[] = [];

      try {
        requiresKeyword = newJobCapsServiceAnalytics.isKeywordAndTextType(dependentVariable);
      } catch (e) {
        // Additional error handling due to missing field type is handled by loadEvalData
        console.error('Unable to load new field types', e); // eslint-disable-line no-console
      }

      for (let i = 0; i < classificationClasses.length; i++) {
        const rocCurveClassName = classificationClasses[i];
        const evalData = await loadEvalData({
          isTraining: isTrainingFilter(searchQuery, resultsField),
          index: jobConfig.dest.index,
          dependentVariable,
          resultsField,
          predictionFieldName: getPredictionFieldName(jobConfig.analysis),
          searchQuery,
          jobType: ANALYSIS_CONFIG_TYPE.CLASSIFICATION,
          requiresKeyword,
          rocCurveClassName,
          includeMulticlassConfusionMatrix: false,
        });

        if (
          evalData.success === true &&
          evalData.eval &&
          isClassificationEvaluateResponse(evalData.eval)
        ) {
          const auc = evalData.eval?.classification?.auc_roc?.value || 0;

          // For binary classification jobs we use the 'ROC' label,
          // for multi-class classification the original class name.
          const rocCurveClassLabel =
            classificationClasses.length > BINARY_CLASSIFICATION_THRESHOLD
              ? classificationClasses[i]
              : ROC_CLASS_NAME;

          const rocCurveDataForClass = (evalData.eval?.classification?.auc_roc?.curve || []).map(
            (d) => ({
              class_name: `${rocCurveClassLabel} (${AUC_VALUE_LABEL}: ${
                Math.round(auc * AUC_ROUNDING_VALUE) / AUC_ROUNDING_VALUE
              })`,
              ...d,
            })
          );
          newRocCurveData.push(...rocCurveDataForClass);
        } else if (evalData.error !== null) {
          errors.push(evalData.error);
        }
      }

      setError(errors.length > 0 ? errors : null);
      setRocCurveData(newRocCurveData);
      setIsLoading(false);
    }

    loadRocCurveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([jobConfig, searchQuery, columns])]);

  return {
    rocCurveData,
    // To match the data that was generated for the class,
    // for multi-class classification jobs this returns all class names,
    // for binary classification it returns just ['ROC'].
    classificationClasses:
      classificationClasses.length > BINARY_CLASSIFICATION_THRESHOLD
        ? classificationClasses
        : [ROC_CLASS_NAME],
    error,
    isLoading,
  };
};
