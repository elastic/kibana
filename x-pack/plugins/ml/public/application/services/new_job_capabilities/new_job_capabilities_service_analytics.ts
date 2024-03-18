/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataViewType } from '@kbn/data-views-plugin/public';
import type { Field, NewJobCapsResponse } from '@kbn/ml-anomaly-utils';
import {
  getDependentVar,
  getNumTopClasses,
  getNumTopFeatureImportanceValues,
  getPredictionFieldName,
  isClassificationAnalysis,
  isOutlierAnalysis,
  isRegressionAnalysis,
  sortExplorationResultsFields,
  DEFAULT_REGRESSION_COLUMNS,
  FEATURE_IMPORTANCE,
  FEATURE_INFLUENCE,
  OUTLIER_SCORE,
  TOP_CLASSES,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';
import { processTextAndKeywordFields, NewJobCapabilitiesServiceBase } from './new_job_capabilities';
import { ml } from '../ml_api_service';

// Keep top nested field and remove all <nested_field>.* fields
export function removeNestedFieldChildren(resp: NewJobCapsResponse, indexPatternTitle: string) {
  const results = resp[indexPatternTitle];
  const fields: Field[] = [];
  const nestedFields: Record<string, boolean> = {};

  if (results !== undefined) {
    results.fields.forEach((field: Field) => {
      if (field.type === ES_FIELD_TYPES.NESTED && nestedFields[field.name] === undefined) {
        nestedFields[field.name] = true;
        fields.push(field);
      }
    });

    if (Object.keys(nestedFields).length > 0) {
      results.fields.forEach((field: Field) => {
        if (field.type !== ES_FIELD_TYPES.NESTED) {
          const fieldNameParts = field.name.split('.');
          const rootOfField = fieldNameParts.shift();
          if (rootOfField && nestedFields[rootOfField] === undefined) {
            fields.push(field);
          }
        }
      });
    } else {
      fields.push(...results.fields);
    }
  }
  return fields;
}

class NewJobCapsServiceAnalytics extends NewJobCapabilitiesServiceBase {
  public async initializeFromDataVIew(dataView: DataView) {
    try {
      const resp: NewJobCapsResponse = await ml.dataFrameAnalytics.newJobCapsAnalytics(
        dataView.getIndexPattern(),
        dataView.type === DataViewType.ROLLUP
      );

      const allFields = removeNestedFieldChildren(resp, dataView.getIndexPattern());

      const { fieldsPreferringKeyword } = processTextAndKeywordFields(allFields);

      // set the main fields list to contain fields which have been filtered to prefer
      // keyword fields over text fields.
      // e.g. if foo.keyword and foo exist, don't add foo to the list.
      this._fields = fieldsPreferringKeyword;
      this.removeCounterFields();
    } catch (error) {
      console.error('Unable to load analytics index fields', error); // eslint-disable-line no-console
    }
  }

  public isKeywordAndTextType(fieldName: string): boolean {
    const fieldType = this.fields.find((field) => field.name === fieldName)?.type;
    let isBothTypes = false;

    // If it's a keyword type - check if it has a corresponding text type
    if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.KEYWORD) {
      const field = this.getFieldById(fieldName.replace(/\.keyword$/, ''));
      isBothTypes = field !== null && field.type === ES_FIELD_TYPES.TEXT;
    } else if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.TEXT) {
      //   If text, check if has corresponding keyword type
      const field = this.getFieldById(`${fieldName}.keyword`);
      isBothTypes = field !== null && field.type === ES_FIELD_TYPES.KEYWORD;
    }

    return isBothTypes;
  }

  public getDefaultFields(
    jobConfig: DataFrameAnalyticsConfig,
    needsDestIndexFields: boolean
  ): {
    selectedFields: Field[];
    docFields: Field[];
    depVarType?: ES_FIELD_TYPES;
  } {
    let fields: Field[] = [...this.fields];

    const fieldsObj = {
      selectedFields: [],
      docFields: [],
    };
    if (fields.length === 0) {
      return fieldsObj;
    }

    // default is 'ml'
    const resultsField = jobConfig.dest.results_field;

    const allFields: any = [];
    let type: ES_FIELD_TYPES | undefined;
    let predictedField: string | undefined;

    if (isOutlierAnalysis(jobConfig.analysis)) {
      if (!jobConfig.analysis.outlier_detection.compute_feature_influence) {
        // remove all feature influence fields
        fields = fields.filter(
          (field) => !field.name.includes(`${resultsField}.${FEATURE_INFLUENCE}`)
        );
      } else {
        // remove flattened feature influence fields
        fields = fields.filter(
          (field: any) => !field.name.includes(`${resultsField}.${FEATURE_INFLUENCE}.`)
        );
      }

      // Only need to add these fields if we didn't use dest data view to get the fields
      if (needsDestIndexFields === true) {
        allFields.push({
          id: `${resultsField}.${OUTLIER_SCORE}`,
          name: `${resultsField}.${OUTLIER_SCORE}`,
          type: KBN_FIELD_TYPES.NUMBER,
        });
      }
    }

    if (isClassificationAnalysis(jobConfig.analysis) || isRegressionAnalysis(jobConfig.analysis)) {
      const dependentVariable = getDependentVar(jobConfig.analysis);
      type = this.getFieldById(dependentVariable)?.type;
      const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
      const numTopFeatureImportanceValues = getNumTopFeatureImportanceValues(jobConfig.analysis);
      const numTopClasses = getNumTopClasses(jobConfig.analysis);

      const defaultPredictionField = `${dependentVariable}_prediction`;
      predictedField = `${resultsField}.${
        predictionFieldName ? predictionFieldName : defaultPredictionField
      }`;

      if ((numTopFeatureImportanceValues ?? 0) === 0) {
        // remove all feature importance fields
        fields = this.fields.filter(
          (field: any) => !field.name.includes(`${resultsField}.${FEATURE_IMPORTANCE}`)
        );
      } else {
        // remove flattened feature importance fields
        fields = fields.filter(
          (field: any) => !field.name.includes(`${resultsField}.${FEATURE_IMPORTANCE}.`)
        );
      }

      if ((numTopClasses ?? 0) === 0) {
        // remove all top classes fields
        fields = fields.filter(
          (field: any) => !field.name.includes(`${resultsField}.${TOP_CLASSES}`)
        );
      } else {
        // remove flattened top classes fields
        fields = fields.filter(
          (field: any) => !field.name.includes(`${resultsField}.${TOP_CLASSES}.`)
        );
      }

      // Only need to add these fields if we didn't use dest data view to get the fields
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

    allFields.push(...fields);
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
  }
}

export const newJobCapsServiceAnalytics = new NewJobCapsServiceAnalytics();
