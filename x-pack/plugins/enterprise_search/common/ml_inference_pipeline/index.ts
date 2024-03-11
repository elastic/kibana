/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestInferenceProcessor,
  IngestPipeline,
  MlTrainedModelConfig,
  MlTrainedModelStats,
} from '@elastic/elasticsearch/lib/api/types';

import {
  SUPPORTED_PYTORCH_TASKS,
  TRAINED_MODEL_TYPE,
  BUILT_IN_MODEL_TAG,
} from '@kbn/ml-trained-models-utils';

import { MlModel } from '../types/ml';

import {
  MlInferencePipeline,
  CreateMLInferencePipeline,
  TrainedModelState,
  InferencePipelineInferenceConfig,
} from '../types/pipelines';

export const TEXT_EXPANSION_TYPE = SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION;
export const TEXT_EXPANSION_FRIENDLY_TYPE = 'ELSER';
export const ML_INFERENCE_PREFIX = 'ml.inference.';

export interface MlInferencePipelineParams {
  description?: string;
  fieldMappings: FieldMapping[];
  inferenceConfig?: InferencePipelineInferenceConfig;
  model: MlModel;
  pipelineName: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

/**
 * Generates the pipeline body for a machine learning inference pipeline
 * @param pipelineConfiguration machine learning inference pipeline configuration parameters
 * @returns pipeline body
 */
export const generateMlInferencePipelineBody = ({
  description,
  fieldMappings,
  inferenceConfig,
  model,
  pipelineName,
}: MlInferencePipelineParams): MlInferencePipeline => {
  // @ts-expect-error pipeline._meta defined as mandatory
  const pipelineDefinition: MlInferencePipeline = {
    description: description ?? '',
    processors: [],
    version: 1,
  };

  pipelineDefinition.processors = [
    // Add remove and inference processors
    ...fieldMappings.flatMap(({ sourceField, targetField }) => {
      const inference = getInferenceProcessor(
        sourceField,
        targetField,
        inferenceConfig,
        model,
        pipelineName
      );

      return [
        {
          remove: {
            field: targetField,
            ignore_missing: true,
          },
        },
        { inference },
      ];
    }),
    // Add single append processor
    {
      append: {
        field: '_source._ingest.processors',
        value: [
          {
            model_version: model.version,
            pipeline: pipelineName,
            processed_timestamp: '{{{ _ingest.timestamp }}}',
            types: model.types,
          },
        ],
      },
    },
  ];

  return pipelineDefinition;
};

export const getInferenceProcessor = (
  sourceField: string,
  targetField: string,
  inferenceConfig: InferencePipelineInferenceConfig | undefined,
  model: MlModel,
  pipelineName: string
): IngestInferenceProcessor => {
  // If model returned no input field, insert a placeholder
  const modelInputField =
    model.inputFieldNames.length > 0 ? model.inputFieldNames[0] : 'MODEL_INPUT_FIELD';

  return {
    field_map: {
      [sourceField]: modelInputField,
    },
    inference_config: inferenceConfig,
    model_id: model.modelId,
    on_failure: [
      {
        append: {
          field: '_source._ingest.inference_errors',
          allow_duplicates: false,
          value: [
            {
              message: `Processor 'inference' in pipeline '${pipelineName}' failed for field '${sourceField}' with message '{{ _ingest.on_failure_message }}'`,
              pipeline: pipelineName,
              timestamp: '{{{ _ingest.timestamp }}}',
            },
          ],
        },
      },
    ],
    target_field: targetField,
  };
};

/**
 * Parses model types list from the given configuration of a trained machine learning model
 * @param trainedModel configuration for a trained machine learning model
 * @returns list of model types
 */
export const getMlModelTypesForModelConfig = (trainedModel: MlTrainedModelConfig): string[] => {
  if (!trainedModel) return [];

  const isBuiltIn = trainedModel.tags?.includes(BUILT_IN_MODEL_TAG);

  return [
    trainedModel.model_type,
    ...Object.keys(trainedModel.inference_config || {}),
    ...(isBuiltIn ? [BUILT_IN_MODEL_TAG] : []),
  ].filter((type): type is string => type !== undefined);
};

export const formatPipelineName = (rawName: string) =>
  rawName
    .trim()
    .replace(/\s+/g, '_') // Convert whitespaces to underscores
    .toLowerCase();

export const parseMlInferenceParametersFromPipeline = (
  name: string,
  pipeline: IngestPipeline
): CreateMLInferencePipeline | null => {
  const inferenceProcessors = pipeline?.processors
    ?.filter((p) => p.inference)
    .map((p) => p.inference) as IngestInferenceProcessor[];
  if (!inferenceProcessors || inferenceProcessors.length === 0) {
    return null;
  }

  // Extract source -> target field mappings from all inference processors in pipeline
  const fieldMappings = inferenceProcessors
    .map((p) => {
      const sourceFields = Object.keys(p.field_map ?? {});
      // We assume that there is only one source field per inference processor
      const sourceField = sourceFields.length >= 1 ? sourceFields[0] : null;
      return {
        sourceField,
        targetField: p.target_field, // Prefixed target field
      };
    })
    .filter((f) => f.sourceField) as FieldMapping[];

  // @ts-expect-error pipeline._meta defined as mandatory
  return fieldMappings.length === 0
    ? null
    : {
        model_id: inferenceProcessors[0].model_id,
        pipeline_name: name,
        pipeline_definition: {},
        field_mappings: fieldMappings,
      };
};

export const parseModelStateFromStats = (
  model?: Partial<MlTrainedModelStats> & Partial<MlTrainedModelConfig>,
  modelTypes?: string[]
) => {
  if (
    model?.model_type === TRAINED_MODEL_TYPE.LANG_IDENT ||
    modelTypes?.includes(TRAINED_MODEL_TYPE.LANG_IDENT)
  )
    return TrainedModelState.Started;

  return parseModelState(model?.deployment_stats?.state);
};

export const parseModelState = (state?: string) => {
  switch (state) {
    case 'started':
    case 'fully_allocated':
      return TrainedModelState.Started;
    case 'starting':
    case 'downloading':
    case 'downloaded':
      return TrainedModelState.Starting;
    case 'stopping':
      return TrainedModelState.Stopping;
    // @ts-ignore: type is wrong, "failed" is a possible state
    case 'failed':
      return TrainedModelState.Failed;
    default:
      return TrainedModelState.NotDeployed;
  }
};

export const parseModelStateReasonFromStats = (trainedModelStats?: Partial<MlTrainedModelStats>) =>
  trainedModelStats?.deployment_stats?.reason;

export const getMlInferencePrefixedFieldName = (fieldName: string) =>
  fieldName.startsWith(ML_INFERENCE_PREFIX) ? fieldName : `${ML_INFERENCE_PREFIX}${fieldName}`;
