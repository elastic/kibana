/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuntimeMappings } from '../../../../../../../common/types/fields';
import { DeepPartial, DeepReadonly } from '../../../../../../../common/types/common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../../../ml_nodes_check';
import { isRuntimeMappings } from '../../../../../../../common/util/runtime_field_utils';

import { defaultSearchQuery, getAnalysisType } from '../../../../common/analytics';
import { CloneDataFrameAnalyticsConfig } from '../../components/action_clone';
import {
  DataFrameAnalyticsConfig,
  DataFrameAnalyticsId,
  DataFrameAnalysisConfigType,
  FeatureProcessor,
} from '../../../../../../../common/types/data_frame_analytics';
import { isClassificationAnalysis } from '../../../../../../../common/util/analytics_utils';
import { ANALYSIS_CONFIG_TYPE } from '../../../../../../../common/constants/data_frame_analytics';
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
export type AnalyticsJobType = DataFrameAnalysisConfigType | undefined;
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
    alpha: undefined | number;
    computeFeatureInfluence: string;
    createIndexPattern: boolean;
    classAssignmentObjective: undefined | string;
    dependentVariable: DependentVariable;
    description: string;
    destinationIndex: EsIndexName;
    destinationIndexNameExists: boolean;
    destinationIndexNameEmpty: boolean;
    destinationIndexNameValid: boolean;
    destinationIndexPatternTitleExists: boolean;
    downsampleFactor: undefined | number;
    earlyStoppingEnabled: undefined | boolean;
    eta: undefined | number;
    etaGrowthRatePerTree: undefined | number;
    featureBagFraction: undefined | number;
    featureInfluenceThreshold: undefined | number;
    featureProcessors: undefined | FeatureProcessor[];
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
    jobConfigQueryLanguage: string | undefined;
    lambda: number | undefined;
    lossFunction: string | undefined;
    lossFunctionParameter: number | undefined;
    loadingFieldOptions: boolean;
    maxNumThreads: undefined | number;
    maxOptimizationRoundsPerHyperparameter: undefined | number;
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
    runtimeMappings: undefined | RuntimeMappings;
    runtimeMappingsUpdated: boolean;
    previousRuntimeMapping: undefined | RuntimeMappings;
    softTreeDepthLimit: undefined | number;
    softTreeDepthTolerance: undefined | number;
    sourceIndex: EsIndexName;
    sourceIndexNameEmpty: boolean;
    sourceIndexNameValid: boolean;
    sourceIndexContainsNumericalFields: boolean;
    sourceIndexFieldsCheckFailed: boolean;
    standardizationEnabled: undefined | string;
    trainingPercent: number;
    useEstimatedMml: boolean;
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
    alpha: undefined,
    computeFeatureInfluence: 'true',
    createIndexPattern: true,
    classAssignmentObjective: undefined,
    dependentVariable: '',
    description: '',
    destinationIndex: '',
    destinationIndexNameExists: false,
    destinationIndexNameEmpty: true,
    destinationIndexNameValid: false,
    destinationIndexPatternTitleExists: false,
    earlyStoppingEnabled: undefined,
    downsampleFactor: undefined,
    eta: undefined,
    etaGrowthRatePerTree: undefined,
    featureBagFraction: undefined,
    featureInfluenceThreshold: undefined,
    featureProcessors: undefined,
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
    jobConfigQueryLanguage: undefined,
    lambda: undefined,
    lossFunction: undefined,
    lossFunctionParameter: undefined,
    loadingFieldOptions: false,
    maxNumThreads: DEFAULT_MAX_NUM_THREADS,
    maxOptimizationRoundsPerHyperparameter: undefined,
    maxTrees: undefined,
    method: undefined,
    modelMemoryLimit: undefined,
    modelMemoryLimitUnitValid: true,
    modelMemoryLimitValidationResult: null,
    nNeighbors: undefined,
    numTopFeatureImportanceValues: DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
    numTopFeatureImportanceValuesValid: true,
    numTopClasses: -1,
    outlierFraction: undefined,
    predictionFieldName: undefined,
    previousJobType: null,
    requiredFieldsError: undefined,
    randomizeSeed: undefined,
    resultsField: undefined,
    runtimeMappings: undefined,
    runtimeMappingsUpdated: false,
    previousRuntimeMapping: undefined,
    softTreeDepthLimit: undefined,
    softTreeDepthTolerance: undefined,
    sourceIndex: '',
    sourceIndexNameEmpty: true,
    sourceIndexNameValid: false,
    sourceIndexContainsNumericalFields: true,
    sourceIndexFieldsCheckFailed: false,
    standardizationEnabled: 'true',
    trainingPercent: 80,
    useEstimatedMml: true,
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
      // If a Kibana data view name includes commas, we need to split
      // the into an array of indices to be in the correct format for
      // the data frame analytics API.
      index: formState.sourceIndex.includes(',')
        ? formState.sourceIndex.split(',').map((d) => d.trim())
        : formState.sourceIndex,
      query: formState.jobConfigQuery,
      ...(isRuntimeMappings(formState.runtimeMappings)
        ? { runtime_mappings: formState.runtimeMappings }
        : {}),
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
      formState.alpha && { alpha: formState.alpha },
      formState.eta && { eta: formState.eta },
      formState.etaGrowthRatePerTree && {
        eta_growth_rate_per_tree: formState.etaGrowthRatePerTree,
      },
      formState.downsampleFactor && { downsample_factor: formState.downsampleFactor },
      formState.featureBagFraction && {
        feature_bag_fraction: formState.featureBagFraction,
      },
      formState.featureProcessors && {
        feature_processors: formState.featureProcessors,
      },
      formState.gamma && { gamma: formState.gamma },
      formState.lambda && { lambda: formState.lambda },
      formState.lossFunction && { loss_function: formState.lossFunction },
      formState.lossFunctionParameter && {
        loss_function_parameter: formState.lossFunctionParameter,
      },
      formState.maxOptimizationRoundsPerHyperparameter && {
        max_optimization_rounds_per_hyperparameter:
          formState.maxOptimizationRoundsPerHyperparameter,
      },
      formState.maxTrees && { max_trees: formState.maxTrees },
      formState.randomizeSeed && { randomize_seed: formState.randomizeSeed },
      formState.earlyStoppingEnabled !== undefined && {
        early_stopping_enabled: formState.earlyStoppingEnabled,
      },
      formState.predictionFieldName && { prediction_field_name: formState.predictionFieldName },
      formState.randomizeSeed && { randomize_seed: formState.randomizeSeed },
      formState.softTreeDepthLimit && { soft_tree_depth_limit: formState.softTreeDepthLimit },
      formState.softTreeDepthTolerance && {
        soft_tree_depth_tolerance: formState.softTreeDepthTolerance,
      }
    );

    jobConfig.analysis = {
      [formState.jobType]: analysis,
    };
  }

  if (jobConfig?.analysis !== undefined && isClassificationAnalysis(jobConfig?.analysis)) {
    if (formState.numTopClasses !== undefined) {
      jobConfig.analysis.classification.num_top_classes = formState.numTopClasses;
    }
    if (formState.classAssignmentObjective !== undefined) {
      jobConfig.analysis.classification.class_assignment_objective =
        formState.classAssignmentObjective;
    }
  }

  if (formState.jobType === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION) {
    const analysis = Object.assign(
      {},
      formState.computeFeatureInfluence !== undefined && {
        compute_feature_influence: formState.computeFeatureInfluence,
      },
      formState.method && { method: formState.method },
      formState.nNeighbors && {
        n_neighbors: formState.nNeighbors,
      },
      formState.outlierFraction && { outlier_fraction: formState.outlierFraction },
      formState.featureInfluenceThreshold && {
        feature_influence_threshold: formState.featureInfluenceThreshold,
      },
      formState.standardizationEnabled !== undefined && {
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
  const jobType = getAnalysisType(analyticsJobConfig.analysis) as DataFrameAnalysisConfigType;
  const resultState: Partial<State['form']> = {
    jobType,
    description: analyticsJobConfig.description ?? '',
    resultsField: analyticsJobConfig.dest.results_field,
    sourceIndex: Array.isArray(analyticsJobConfig.source.index)
      ? analyticsJobConfig.source.index.join(',')
      : analyticsJobConfig.source.index,
    runtimeMappings: analyticsJobConfig.source.runtime_mappings,
    modelMemoryLimit: analyticsJobConfig.model_memory_limit,
    maxNumThreads: analyticsJobConfig.max_num_threads,
    includes: analyticsJobConfig.analyzed_fields?.includes ?? [],
    jobConfigQuery: analyticsJobConfig.source.query || defaultSearchQuery,
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
