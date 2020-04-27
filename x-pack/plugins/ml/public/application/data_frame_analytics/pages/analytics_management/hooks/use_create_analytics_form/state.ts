/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DeepPartial, DeepReadonly } from '../../../../../../../common/types/common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../../ml_nodes_check';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';

import {
  isClassificationAnalysis,
  isRegressionAnalysis,
  DataFrameAnalyticsId,
  DataFrameAnalyticsConfig,
  ANALYSIS_CONFIG_TYPE,
} from '../../../../common/analytics';
import { CloneDataFrameAnalyticsConfig } from '../../components/analytics_list/action_clone';

export enum DEFAULT_MODEL_MEMORY_LIMIT {
  regression = '100mb',
  // eslint-disable-next-line @typescript-eslint/camelcase
  outlier_detection = '50mb',
  classification = '100mb',
}

export const DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES = 2;

export type EsIndexName = string;
export type DependentVariable = string;
export type IndexPatternTitle = string;
export type AnalyticsJobType = ANALYSIS_CONFIG_TYPE | undefined;
type IndexPatternId = string;
export type SourceIndexMap = Record<
  IndexPatternTitle,
  { label: IndexPatternTitle; value: IndexPatternId }
>;

export interface FormMessage {
  error?: string;
  message: string;
}

export interface State {
  advancedEditorMessages: FormMessage[];
  advancedEditorRawString: string;
  form: {
    createIndexPattern: boolean;
    dependentVariable: DependentVariable;
    dependentVariableFetchFail: boolean;
    dependentVariableOptions: EuiComboBoxOptionOption[];
    description: string;
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    excludes: string[];
    excludesOptions: EuiComboBoxOptionOption[];
    fieldOptionsFetchFail: boolean;
    jobId: DataFrameAnalyticsId;
    jobIdExists: boolean;
    jobIdEmpty: boolean;
    jobIdInvalidMaxLength: boolean;
    jobIdValid: boolean;
    jobType: AnalyticsJobType;
    loadingDepVarOptions: boolean;
    loadingFieldOptions: boolean;
    maxDistinctValuesError: string | undefined;
    modelMemoryLimit: string | undefined;
    modelMemoryLimitUnitValid: boolean;
    modelMemoryLimitValidationResult: any;
    numTopFeatureImportanceValues: number | undefined;
    numTopFeatureImportanceValuesValid: boolean;
    previousJobType: null | AnalyticsJobType;
    previousSourceIndex: EsIndexName | undefined;
    sourceIndex: EsIndexName;
    sourceIndexNameEmpty: boolean;
    sourceIndexNameValid: boolean;
    sourceIndexContainsNumericalFields: boolean;
    sourceIndexFieldsCheckFailed: boolean;
    trainingPercent: number;
  };
  disabled: boolean;
  indexNames: EsIndexName[];
  indexPatternsMap: SourceIndexMap;
  isAdvancedEditorEnabled: boolean;
  isAdvancedEditorValidJson: boolean;
  isJobCreated: boolean;
  isJobStarted: boolean;
  isModalButtonDisabled: boolean;
  isModalVisible: boolean;
  isValid: boolean;
  jobConfig: DeepPartial<DataFrameAnalyticsConfig>;
  jobIds: DataFrameAnalyticsId[];
  requestMessages: FormMessage[];
  estimatedModelMemoryLimit: string;
  cloneJob?: DeepReadonly<DataFrameAnalyticsConfig>;
}

export const getInitialState = (): State => ({
  advancedEditorMessages: [],
  advancedEditorRawString: '',
  form: {
    createIndexPattern: false,
    dependentVariable: '',
    dependentVariableFetchFail: false,
    dependentVariableOptions: [],
    description: '',
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    excludes: [],
    fieldOptionsFetchFail: false,
    excludesOptions: [],
    jobId: '',
    jobIdExists: false,
    jobIdEmpty: true,
    jobIdInvalidMaxLength: false,
    jobIdValid: false,
    jobType: undefined,
    loadingDepVarOptions: false,
    loadingFieldOptions: false,
    maxDistinctValuesError: undefined,
    modelMemoryLimit: undefined,
    modelMemoryLimitUnitValid: true,
    modelMemoryLimitValidationResult: null,
    numTopFeatureImportanceValues: DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
    numTopFeatureImportanceValuesValid: true,
    previousJobType: null,
    previousSourceIndex: undefined,
    sourceIndex: '',
    sourceIndexNameEmpty: true,
    sourceIndexNameValid: false,
    sourceIndexContainsNumericalFields: true,
    sourceIndexFieldsCheckFailed: false,
    trainingPercent: 80,
  },
  jobConfig: {},
  disabled:
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics'),
  indexNames: [],
  indexPatternsMap: {},
  isAdvancedEditorEnabled: false,
  isAdvancedEditorValidJson: true,
  isJobCreated: false,
  isJobStarted: false,
  isModalVisible: false,
  isModalButtonDisabled: false,
  isValid: false,
  jobIds: [],
  requestMessages: [],
  estimatedModelMemoryLimit: '',
});

const getExcludesFields = (excluded: string[]) => {
  const { fields } = newJobCapsService;
  const updatedExcluded: string[] = [];
  // Loop through excluded fields to check for multiple types of same field
  for (let i = 0; i < excluded.length; i++) {
    const fieldName = excluded[i];
    let mainField;

    // No dot in fieldName - it is the main field
    if (fieldName.includes('.') === false) {
      mainField = fieldName;
    } else {
      // Dot in fieldName - check if there's a field whose name equals the fieldName with the last dot suffix removed
      const regex = /\.[^.]*$/;
      const suffixRemovedField = fieldName.replace(regex, '');
      const fieldMatch = newJobCapsService.getFieldById(suffixRemovedField);

      // There's a match - set as the main field
      if (fieldMatch !== null) {
        mainField = suffixRemovedField;
      } else {
        // No main field to be found - add the fieldName to updatedExcluded array if it's not already there
        if (updatedExcluded.includes(fieldName) === false) {
          updatedExcluded.push(fieldName);
        }
      }
    }

    if (mainField !== undefined) {
      // Add the main field to the updatedExcluded array if it's not already there
      if (updatedExcluded.includes(mainField) === false) {
        updatedExcluded.push(mainField);
      }
      // Create regex to find all other fields whose names begin with main field followed by a dot
      const regex = new RegExp(`${mainField}\\..+`);

      // Loop through fields and add fields matching the pattern to updatedExcluded array
      for (let j = 0; j < fields.length; j++) {
        const field = fields[j].name;
        if (updatedExcluded.includes(field) === false && field.match(regex) !== null) {
          updatedExcluded.push(field);
        }
      }
    }
  }

  return updatedExcluded;
};

export const getJobConfigFromFormState = (
  formState: State['form']
): DeepPartial<DataFrameAnalyticsConfig> => {
  const jobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    description: formState.description,
    source: {
      // If a Kibana index patterns includes commas, we need to split
      // the into an array of indices to be in the correct format for
      // the data frame analytics API.
      index: formState.sourceIndex.includes(',')
        ? formState.sourceIndex.split(',').map(d => d.trim())
        : formState.sourceIndex,
    },
    dest: {
      index: formState.destinationIndex,
    },
    analyzed_fields: {
      excludes: getExcludesFields(formState.excludes),
    },
    analysis: {
      outlier_detection: {},
    },
    model_memory_limit: formState.modelMemoryLimit,
  };

  if (
    formState.jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
    formState.jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION
  ) {
    jobConfig.analysis = {
      [formState.jobType]: {
        dependent_variable: formState.dependentVariable,
        num_top_feature_importance_values: formState.numTopFeatureImportanceValues,
        training_percent: formState.trainingPercent,
      },
    };
  }

  return jobConfig;
};

/**
 * Extracts form state for a job clone from the analytics job configuration.
 * For cloning we keep job id and destination index empty.
 */
export function getCloneFormStateFromJobConfig(
  analyticsJobConfig: Readonly<CloneDataFrameAnalyticsConfig>
): Partial<State['form']> {
  const jobType = Object.keys(analyticsJobConfig.analysis)[0] as ANALYSIS_CONFIG_TYPE;

  const resultState: Partial<State['form']> = {
    jobType,
    description: analyticsJobConfig.description ?? '',
    sourceIndex: Array.isArray(analyticsJobConfig.source.index)
      ? analyticsJobConfig.source.index.join(',')
      : analyticsJobConfig.source.index,
    modelMemoryLimit: analyticsJobConfig.model_memory_limit,
    excludes: analyticsJobConfig.analyzed_fields.excludes,
  };

  if (
    isRegressionAnalysis(analyticsJobConfig.analysis) ||
    isClassificationAnalysis(analyticsJobConfig.analysis)
  ) {
    const analysisConfig = analyticsJobConfig.analysis[jobType];

    resultState.dependentVariable = analysisConfig.dependent_variable;
    resultState.numTopFeatureImportanceValues = analysisConfig.num_top_feature_importance_values;
    resultState.trainingPercent = analysisConfig.training_percent;
  }

  return resultState;
}
