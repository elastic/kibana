/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlTrainedModelConfig } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { MlInferencePipeline } from '../types/pipelines';

// Getting an error importing this from @kbn/ml-plugin/common/constants/data_frame_analytics'
// So defining it locally for now with a test to make sure it matches.
export const BUILT_IN_MODEL_TAG = 'prepackaged';

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
  return {
    description: description ?? '',
    processors: [
      {
        remove: {
          field: `ml.inference.${destinationField}`,
          ignore_missing: true,
        },
      },
      {
        inference: {
          field_map: {
            [sourceField]: modelInputField,
          },
          model_id: model.model_id,
          target_field: `ml.inference.${destinationField}`,
          on_failure: [
            {
              append: {
                field: '_source._ingest.inference_errors',
                value: [
                  {
                    pipeline: pipelineName,
                    message: `Processor 'inference' in pipeline '${pipelineName}' failed with message '{{ _ingest.on_failure_message }}'`,
                    timestamp: '{{{ _ingest.timestamp }}}',
                  },
                ],
              },
            },
          ],
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
    ],
    version: 1,
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
