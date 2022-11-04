/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestPipeline,
  IngestProcessorContainer,
  IngestRemoveProcessor,
  IngestSetProcessor,
  MlTrainedModelConfig,
} from '@elastic/elasticsearch/lib/api/types';

import { MlInferencePipeline, CreateMlInferencePipelineParameters } from '../types/pipelines';

// Getting an error importing this from @kbn/ml-plugin/common/constants/data_frame_analytics'
// So defining it locally for now with a test to make sure it matches.
export const BUILT_IN_MODEL_TAG = 'prepackaged';

// Getting an error importing this from @kbn/ml-plugin/common/constants/trained_models'
// So defining it locally for now with a test to make sure it matches.
export const SUPPORTED_PYTORCH_TASKS = {
  FILL_MASK: 'fill_mask',
  NER: 'ner',
  QUESTION_ANSWERING: 'question_answering',
  TEXT_CLASSIFICATION: 'text_classification',
  TEXT_EMBEDDING: 'text_embedding',
  ZERO_SHOT_CLASSIFICATION: 'zero_shot_classification',
} as const;

export interface MlInferencePipelineParams {
  description?: string;
  destinationField: string;
  model: MlTrainedModelConfig;
  pipelineName: string;
  sourceField: string;
}

/**
 * Generates the pipeline body for a machine learning inference pipeline
 * @param pipelineConfiguration machine learning inference pipeline configuration parameters
 * @returns pipeline body
 */
export const generateMlInferencePipelineBody = ({
  description,
  destinationField,
  model,
  pipelineName,
  sourceField,
}: MlInferencePipelineParams): MlInferencePipeline => {
  // if model returned no input field, insert a placeholder
  const modelInputField =
    model.input?.field_names?.length > 0 ? model.input.field_names[0] : 'MODEL_INPUT_FIELD';

  const inferenceType = Object.keys(model.inference_config)[0];
  const remove = getRemoveProcessorForInferenceType(destinationField, inferenceType);
  const set = getSetProcessorForInferenceType(destinationField, inferenceType, pipelineName);

  return {
    description: description ?? '',
    processors: [
      {
        remove: {
          field: `ml.inference.${destinationField}`,
          ignore_missing: true,
        },
      },
      ...(remove ? [{ remove }] : []),
      {
        inference: {
          field_map: {
            [sourceField]: modelInputField,
          },
          model_id: model.model_id,
          on_failure: [
            {
              append: {
                field: '_source._ingest.inference_errors',
                value: [
                  {
                    message: `Processor 'inference' in pipeline '${pipelineName}' failed with message '{{ _ingest.on_failure_message }}'`,
                    pipeline: pipelineName,
                    timestamp: '{{{ _ingest.timestamp }}}',
                  },
                ],
              },
            },
          ],
          target_field: `ml.inference.${destinationField}`,
        },
      },
      {
        append: {
          field: '_source._ingest.processors',
          value: [
            {
              model_version: model.version,
              pipeline: pipelineName,
              processed_timestamp: '{{{ _ingest.timestamp }}}',
              types: getMlModelTypesForModelConfig(model),
            },
          ],
        },
      },
      ...(set ? [{ set }] : []),
    ],
    version: 1,
  };
};

export const getSetProcessorForInferenceType = (
  destinationField: string,
  inferenceType: string,
  pipelineName: string
): IngestSetProcessor | undefined => {
  let set: IngestSetProcessor | undefined;
  const prefixedDestinationField = `ml.inference.${destinationField}`;
  const onFailure: IngestProcessorContainer[] = [
    {
      append: {
        field: '_source._ingest.set_errors',
        ignore_failure: true,
        value: [
          {
            message: `Processor 'set' in pipeline '${pipelineName}' failed with message '{{ _ingest.on_failure_message }}'`,
            pipeline: pipelineName,
            timestamp: '{{{ _ingest.timestamp }}}',
          },
        ],
      },
    },
  ];

  if (inferenceType === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION) {
    set = {
      copy_from: `${prefixedDestinationField}.predicted_value`,
      description: `Copy the predicted_value to '${destinationField}' if the prediction_probability is greater than 0.5`,
      field: destinationField,
      if: `${prefixedDestinationField}.prediction_probability > 0.5`,
      on_failure: onFailure,
      value: undefined,
    };
  } else if (inferenceType === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING) {
    set = {
      copy_from: `${prefixedDestinationField}.predicted_value`,
      description: `Copy the predicted_value to '${destinationField}'`,
      field: destinationField,
      on_failure: onFailure,
      value: undefined,
    };
  }

  return set;
};

export const getRemoveProcessorForInferenceType = (
  destinationField: string,
  inferenceType: string
): IngestRemoveProcessor | undefined => {
  if (
    inferenceType === SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION ||
    inferenceType === SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING
  ) {
    return {
      field: destinationField,
      ignore_missing: true,
    };
  }
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
): CreateMlInferencePipelineParameters | null => {
  const processor = pipeline?.processors?.find((proc) => proc.inference !== undefined);
  if (!processor || processor?.inference === undefined) {
    return null;
  }
  const { inference: inferenceProcessor } = processor;
  const sourceFields = Object.keys(inferenceProcessor.field_map ?? {});
  const sourceField = sourceFields.length === 1 ? sourceFields[0] : null;
  if (!sourceField) {
    return null;
  }
  return {
    destination_field: inferenceProcessor.target_field.replace('ml.inference.', ''),
    model_id: inferenceProcessor.model_id,
    pipeline_name: name,
    source_field: sourceField,
  };
};
