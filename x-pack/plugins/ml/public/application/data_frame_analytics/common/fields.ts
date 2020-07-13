/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getNumTopClasses,
  getNumTopFeatureImportanceValues,
  getPredictedFieldName,
  getDependentVar,
  getPredictionFieldName,
  isClassificationAnalysis,
  isOutlierAnalysis,
  isRegressionAnalysis,
  DataFrameAnalyticsConfig,
} from './analytics';
import { Field } from '../../../../common/types/fields';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';
import { newJobCapsService } from '../../services/new_job_capabilities_service';

import { FEATURE_IMPORTANCE, FEATURE_INFLUENCE, OUTLIER_SCORE, TOP_CLASSES } from './constants';

export type EsId = string;
export type EsDocSource = Record<string, any>;
export type EsFieldName = string;

export interface EsDoc extends Record<string, any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 10;
export const DEFAULT_REGRESSION_COLUMNS = 8;

export const BASIC_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
]);

export const EXTENDED_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
]);

export const ML__ID_COPY = 'ml__id_copy';

export const isKeywordAndTextType = (fieldName: string): boolean => {
  const { fields } = newJobCapsService;

  const fieldType = fields.find((field) => field.name === fieldName)?.type;
  let isBothTypes = false;

  // If it's a keyword type - check if it has a corresponding text type
  if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.KEYWORD) {
    const field = newJobCapsService.getFieldById(fieldName.replace(/\.keyword$/, ''));
    isBothTypes = field !== null && field.type === ES_FIELD_TYPES.TEXT;
  } else if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.TEXT) {
    //   If text, check if has corresponding keyword type
    const field = newJobCapsService.getFieldById(`${fieldName}.keyword`);
    isBothTypes = field !== null && field.type === ES_FIELD_TYPES.KEYWORD;
  }

  return isBothTypes;
};

// Used to sort columns:
// - Anchor on the left ml.outlier_score, ml.is_training, <predictedField>, <actual>
// - string based columns are moved to the left
// - feature_influence/feature_importance fields get moved next to the corresponding field column
// - overall fields get sorted alphabetically
export const sortExplorationResultsFields = (
  a: string,
  b: string,
  jobConfig: DataFrameAnalyticsConfig
) => {
  const resultsField = jobConfig.dest.results_field;

  if (isOutlierAnalysis(jobConfig.analysis)) {
    if (a === `${resultsField}.${OUTLIER_SCORE}`) {
      return -1;
    }

    if (b === `${resultsField}.${OUTLIER_SCORE}`) {
      return 1;
    }
  }

  if (isClassificationAnalysis(jobConfig.analysis) || isRegressionAnalysis(jobConfig.analysis)) {
    const dependentVariable = getDependentVar(jobConfig.analysis);
    const predictedField = getPredictedFieldName(resultsField, jobConfig.analysis, true);

    if (a === `${resultsField}.is_training`) {
      return -1;
    }
    if (b === `${resultsField}.is_training`) {
      return 1;
    }
    if (a === predictedField) {
      return -1;
    }
    if (b === predictedField) {
      return 1;
    }
    if (a === dependentVariable || a === dependentVariable.replace(/\.keyword$/, '')) {
      return -1;
    }
    if (b === dependentVariable || b === dependentVariable.replace(/\.keyword$/, '')) {
      return 1;
    }

    if (a === `${resultsField}.prediction_probability`) {
      return -1;
    }
    if (b === `${resultsField}.prediction_probability`) {
      return 1;
    }
  }

  const typeofA = typeof a;
  const typeofB = typeof b;

  const tokensA = a.split('.');
  const prefixA = tokensA[0];
  const tokensB = b.split('.');
  const prefixB = tokensB[0];

  if (prefixA === resultsField && tokensA.length > 1 && prefixB !== resultsField) {
    tokensA.shift();
    tokensA.shift();
    if (tokensA.join('.') === b) return 1;
    return tokensA.join('.').localeCompare(b);
  }

  if (prefixB === resultsField && tokensB.length > 1 && prefixA !== resultsField) {
    tokensB.shift();
    tokensB.shift();
    if (tokensB.join('.') === a) return -1;
    return a.localeCompare(tokensB.join('.'));
  }

  if (typeofA !== 'string' && typeofB === 'string') {
    return 1;
  }
  if (typeofA === 'string' && typeofB !== 'string') {
    return -1;
  }
  if (typeofA === 'string' && typeofB === 'string') {
    return a.localeCompare(b);
  }

  return a.localeCompare(b);
};

export const getDefaultFieldsFromJobCaps = (
  fields: Field[],
  jobConfig: DataFrameAnalyticsConfig,
  needsDestIndexFields: boolean
): {
  selectedFields: Field[];
  docFields: Field[];
  depVarType?: ES_FIELD_TYPES;
} => {
  const fieldsObj = {
    selectedFields: [],
    docFields: [],
  };
  if (fields.length === 0) {
    return fieldsObj;
  }

  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const featureImportanceFields = [];
  const featureInfluenceFields = [];
  const topClassesFields = [];
  const allFields: any = [];
  let type: ES_FIELD_TYPES | undefined;
  let predictedField: string | undefined;

  if (isOutlierAnalysis(jobConfig.analysis)) {
    // Only need to add these fields if we didn't use dest index pattern to get the fields
    if (needsDestIndexFields === true) {
      allFields.push({
        id: `${resultsField}.${OUTLIER_SCORE}`,
        name: `${resultsField}.${OUTLIER_SCORE}`,
        type: KBN_FIELD_TYPES.NUMBER,
      });

      featureInfluenceFields.push(
        ...fields
          .filter((d) => !jobConfig.analyzed_fields.excludes.includes(d.id))
          .map((d) => ({
            id: `${resultsField}.${FEATURE_INFLUENCE}.${d.id}`,
            name: `${resultsField}.${FEATURE_INFLUENCE}.${d.name}`,
            type: KBN_FIELD_TYPES.NUMBER,
          }))
      );
    }
  }

  if (isClassificationAnalysis(jobConfig.analysis) || isRegressionAnalysis(jobConfig.analysis)) {
    const dependentVariable = getDependentVar(jobConfig.analysis);
    type = newJobCapsService.getFieldById(dependentVariable)?.type;
    const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
    const numTopFeatureImportanceValues = getNumTopFeatureImportanceValues(jobConfig.analysis);
    const numTopClasses = getNumTopClasses(jobConfig.analysis);

    const defaultPredictionField = `${dependentVariable}_prediction`;
    predictedField = `${resultsField}.${
      predictionFieldName ? predictionFieldName : defaultPredictionField
    }`;

    if ((numTopFeatureImportanceValues ?? 0) > 0) {
      featureImportanceFields.push({
        id: `${resultsField}.${FEATURE_IMPORTANCE}`,
        name: `${resultsField}.${FEATURE_IMPORTANCE}`,
        type: KBN_FIELD_TYPES.UNKNOWN,
      });
    }

    if ((numTopClasses ?? 0) > 0) {
      topClassesFields.push({
        id: `${resultsField}.${TOP_CLASSES}`,
        name: `${resultsField}.${TOP_CLASSES}`,
        type: KBN_FIELD_TYPES.UNKNOWN,
      });
    }

    // Only need to add these fields if we didn't use dest index pattern to get the fields
    if (needsDestIndexFields === true) {
      allFields.push(
        {
          id: `${resultsField}.is_training`,
          name: `${resultsField}.is_training`,
          type: ES_FIELD_TYPES.BOOLEAN,
        },
        { id: predictedField, name: predictedField, type }
      );
    }
  }

  allFields.push(
    ...fields,
    ...featureImportanceFields,
    ...featureInfluenceFields,
    ...topClassesFields
  );
  allFields.sort(({ name: a }: { name: string }, { name: b }: { name: string }) =>
    sortExplorationResultsFields(a, b, jobConfig)
  );

  let selectedFields = allFields.filter(
    (field: any) => field.name === predictedField || !field.name.includes('.keyword')
  );

  if (selectedFields.length > DEFAULT_REGRESSION_COLUMNS) {
    selectedFields = selectedFields.slice(0, DEFAULT_REGRESSION_COLUMNS);
  }

  return {
    selectedFields,
    docFields: allFields,
    depVarType: type,
  };
};
