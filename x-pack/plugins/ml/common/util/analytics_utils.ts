/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnalysisConfig,
  ClassificationAnalysis,
  OutlierAnalysis,
  RegressionAnalysis,
} from '../types/data_frame_analytics';
import { ANALYSIS_CONFIG_TYPE } from '../../common/constants/data_frame_analytics';

export const isOutlierAnalysis = (arg: any): arg is OutlierAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;
};

export const isRegressionAnalysis = (arg: any): arg is RegressionAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION;
};

export const isClassificationAnalysis = (arg: any): arg is ClassificationAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
};

export const getDependentVar = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['dependent_variable']
  | ClassificationAnalysis['classification']['dependent_variable'] => {
  let depVar = '';

  if (isRegressionAnalysis(analysis)) {
    depVar = analysis.regression.dependent_variable;
  }

  if (isClassificationAnalysis(analysis)) {
    depVar = analysis.classification.dependent_variable;
  }
  return depVar;
};

export const getPredictionFieldName = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['prediction_field_name']
  | ClassificationAnalysis['classification']['prediction_field_name'] => {
  // If undefined will be defaulted to dependent_variable when config is created
  let predictionFieldName;
  if (isRegressionAnalysis(analysis) && analysis.regression.prediction_field_name !== undefined) {
    predictionFieldName = analysis.regression.prediction_field_name;
  } else if (
    isClassificationAnalysis(analysis) &&
    analysis.classification.prediction_field_name !== undefined
  ) {
    predictionFieldName = analysis.classification.prediction_field_name;
  }
  return predictionFieldName;
};

export const getDefaultPredictionFieldName = (analysis: AnalysisConfig) => {
  return `${getDependentVar(analysis)}_prediction`;
};
export const getPredictedFieldName = (
  resultsField: string,
  analysis: AnalysisConfig,
  forSort?: boolean
) => {
  // default is 'ml'
  const predictionFieldName = getPredictionFieldName(analysis);
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : getDefaultPredictionFieldName(analysis)
  }`;
  return predictedField;
};
