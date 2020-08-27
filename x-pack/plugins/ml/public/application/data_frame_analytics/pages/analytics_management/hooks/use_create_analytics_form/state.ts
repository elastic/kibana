/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial, DeepReadonly } from '../../../../../../../common/types/common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../../ml_nodes_check';

import { ANALYSIS_CONFIG_TYPE, defaultSearchQuery } from '../../../../common/analytics';
import { CloneDataFrameAnalyticsConfig } from '../../components/action_clone';
import {
  DataFrameAnalyticsConfig,
  DataFrameAnalyticsId,
} from '../../../../../../../common/types/data_frame_analytics';

export enum DEFAULT_MODEL_MEMORY_LIMIT {
  regression = '100mb',
  outlier_detection = '50mb',
  classification = '100mb',
}

export const DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES = 0;
export const DEFAULT_MAX_NUM_THREADS = 1;
export const UNSET_CONFIG_ITEM = '--';

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
  disableSwitchToForm: boolean;
  form: {
    computeFeatureInfluence: string;
    createIndexPattern: boolean;
    dependentVariable: DependentVariable;
    description: string;
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    eta: undefined | number;
    featureBagFraction: undefined | number;
    featureInfluenceThreshold: undefined | number;
    gamma: undefined | number;
    includes: string[];
    jobId: DataFrameAnalyticsId;
    jobIdExists: boolean;
    jobIdEmpty: boolean;
    jobIdInvalidMaxLength: boolean;
    jobIdValid: boolean;
    jobType: AnalyticsJobType;
    jobConfigQuery: any;
    jobConfigQueryString: string | undefined;
    lambda: number | undefined;
    loadingFieldOptions: boolean;
    maxNumThreads: undefined | number;
    maxTrees: undefined | number;
    method: undefined | string;
    modelMemoryLimit: string | undefined;
    modelMemoryLimitUnitValid: boolean;
    modelMemoryLimitValidationResult: any;
    nNeighbors: undefined | number;
    numTopFeatureImportanceValues: number | undefined;
    numTopFeatureImportanceValuesValid: boolean;
    numTopClasses: number;
    outlierFraction: undefined | number;
    predictionFieldName: undefined | string;
    previousJobType: null | AnalyticsJobType;
    requiredFieldsError: string | undefined;
    randomizeSeed: undefined | number;
    resultsField: undefined | string;
    sourceIndex: EsIndexName;
    sourceIndexNameEmpty: boolean;
    sourceIndexNameValid: boolean;
    sourceIndexContainsNumericalFields: boolean;
    sourceIndexFieldsCheckFailed: boolean;
    standardizationEnabled: undefined | string;
    trainingPercent: number;
  };
  disabled: boolean;
  indexPatternsMap: SourceIndexMap;
  isAdvancedEditorEnabled: boolean;
  isAdvancedEditorValidJson: boolean;
  hasSwitchedToEditor: boolean;
  isJobCreated: boolean;
  isJobStarted: boolean;
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
  disableSwitchToForm: false,
  form: {
    computeFeatureInfluence: 'true',
    createIndexPattern: true,
    dependentVariable: '',
    description: '',
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    eta: undefined,
    featureBagFraction: undefined,
    featureInfluenceThreshold: undefined,
    gamma: undefined,
    includes: [],
    jobId: '',
    jobIdExists: false,
    jobIdEmpty: true,
    jobIdInvalidMaxLength: false,
    jobIdValid: false,
    jobType: undefined,
    jobConfigQuery: defaultSearchQuery,
    jobConfigQueryString: undefined,
    lambda: undefined,
    loadingFieldOptions: false,
    maxNumThreads: DEFAULT_MAX_NUM_THREADS,
    maxTrees: undefined,
    method: undefined,
    modelMemoryLimit: undefined,
    modelMemoryLimitUnitValid: true,
    modelMemoryLimitValidationResult: null,
    nNeighbors: undefined,
    numTopFeatureImportanceValues: DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
    numTopFeatureImportanceValuesValid: true,
    numTopClasses: 2,
    outlierFraction: undefined,
    predictionFieldName: undefined,
    previousJobType: null,
    requiredFieldsError: undefined,
    randomizeSeed: undefined,
    resultsField: undefined,
    sourceIndex: '',
    sourceIndexNameEmpty: true,
    sourceIndexNameValid: false,
    sourceIndexContainsNumericalFields: true,
    sourceIndexFieldsCheckFailed: false,
    standardizationEnabled: 'true',
    trainingPercent: 80,
  },
  jobConfig: {},
  disabled:
    !mlNodesAvailable() ||
    !checkPermission('canCreateDataFrameAnalytics') ||
    !checkPermission('canStartStopDataFrameAnalytics'),
  indexPatternsMap: {},
  isAdvancedEditorEnabled: false,
  isAdvancedEditorValidJson: true,
  hasSwitchedToEditor: false,
  isJobCreated: false,
  isJobStarted: false,
  isValid: false,
  jobIds: [],
  requestMessages: [],
  estimatedModelMemoryLimit: '',
});

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
        ? formState.sourceIndex.split(',').map((d) => d.trim())
        : formState.sourceIndex,
      query: formState.jobConfigQuery,
    },
    dest: {
      index: formState.destinationIndex,
    },
    analyzed_fields: {
      includes: formState.includes,
    },
    analysis: {
      outlier_detection: {},
    },
    model_memory_limit: formState.modelMemoryLimit,
  };

  if (formState.maxNumThreads !== undefined) {
    jobConfig.max_num_threads = formState.maxNumThreads;
  }

  const resultsFieldEmpty =
    typeof formState?.resultsField === 'string' && formState?.resultsField.trim() === '';

  if (jobConfig.dest && !resultsFieldEmpty) {
    jobConfig.dest.results_field = formState.resultsField;
  }

  if (
    formState.jobType === ANALYSIS_CONFIG_TYPE.REGRESSION ||
    formState.jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION
  ) {
    let analysis = {
      dependent_variable: formState.dependentVariable,
      num_top_feature_importance_values: formState.numTopFeatureImportanceValues,
      training_percent: formState.trainingPercent,
    };

    analysis = Object.assign(
      analysis,
      formState.predictionFieldName && { prediction_field_name: formState.predictionFieldName },
      formState.eta && { eta: formState.eta },
      formState.featureBagFraction && {
        feature_bag_fraction: formState.featureBagFraction,
      },
      formState.gamma && { gamma: formState.gamma },
      formState.lambda && { lambda: formState.lambda },
      formState.maxTrees && { max_trees: formState.maxTrees },
      formState.randomizeSeed && { randomize_seed: formState.randomizeSeed }
    );

    jobConfig.analysis = {
      [formState.jobType]: analysis,
    };
  }

  if (
    formState.jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
    jobConfig?.analysis?.classification !== undefined &&
    formState.numTopClasses !== undefined
  ) {
    // @ts-ignore
    jobConfig.analysis.classification.num_top_classes = formState.numTopClasses;
  }

  if (formState.jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION) {
    const analysis = Object.assign(
      {},
      formState.method && { method: formState.method },
      formState.nNeighbors && {
        n_neighbors: formState.nNeighbors,
      },
      formState.outlierFraction && { outlier_fraction: formState.outlierFraction },
      formState.featureInfluenceThreshold && {
        feature_influence_threshold: formState.featureInfluenceThreshold,
      },
      formState.standardizationEnabled && {
        standardization_enabled: formState.standardizationEnabled,
      }
    );
    // @ts-ignore
    jobConfig.analysis.outlier_detection = analysis;
  }

  return jobConfig;
};

function toCamelCase(property: string): string {
  const camelCased = property.replace(/_([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });

  return camelCased;
}

/**
 * Extracts form state for a job clone from the analytics job configuration.
 * For cloning we keep job id and destination index empty.
 */
export function getFormStateFromJobConfig(
  analyticsJobConfig: Readonly<CloneDataFrameAnalyticsConfig>,
  isClone: boolean = true
): Partial<State['form']> {
  const jobType = Object.keys(analyticsJobConfig.analysis)[0] as ANALYSIS_CONFIG_TYPE;

  const resultState: Partial<State['form']> = {
    jobType,
    description: analyticsJobConfig.description ?? '',
    resultsField: analyticsJobConfig.dest.results_field,
    sourceIndex: Array.isArray(analyticsJobConfig.source.index)
      ? analyticsJobConfig.source.index.join(',')
      : analyticsJobConfig.source.index,
    modelMemoryLimit: analyticsJobConfig.model_memory_limit,
    maxNumThreads: analyticsJobConfig.max_num_threads,
    includes: analyticsJobConfig.analyzed_fields.includes,
  };

  if (isClone === false) {
    resultState.destinationIndex = analyticsJobConfig?.dest.index ?? '';
  }

  const analysisConfig = analyticsJobConfig.analysis[jobType];

  for (const key in analysisConfig) {
    if (analysisConfig.hasOwnProperty(key)) {
      const camelCased = toCamelCase(key);
      // @ts-ignore
      resultState[camelCased] = analysisConfig[key];
    }
  }

  return resultState;
}
