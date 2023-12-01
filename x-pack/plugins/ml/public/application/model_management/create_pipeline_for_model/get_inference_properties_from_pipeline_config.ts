/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';
import { DEFAULT_INPUT_FIELD } from '../test_models/models/inference_base';

const INPUT_FIELD = 'inputField';
const ZERO_SHOT_CLASSIFICATION_PROPERTIES = ['labels', 'multi_label'] as const;
const QUESTION_ANSWERING_PROPERTIES = ['question'] as const;

const MODEL_INFERENCE_CONFIG_PROPERTIES = {
  [SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING]: QUESTION_ANSWERING_PROPERTIES,
  [SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION]: ZERO_SHOT_CLASSIFICATION_PROPERTIES,
} as const;

type SupportedModelInferenceConfigPropertiesType = keyof typeof MODEL_INFERENCE_CONFIG_PROPERTIES;

// Currently, estypes doesn't include pipeline processor types with the trained model processors
type MLInferencePipelineInferenceConfig = estypes.IngestPipeline & {
  zero_shot_classification?: estypes.MlZeroShotClassificationInferenceOptions;
  question_answering?: estypes.MlQuestionAnsweringInferenceUpdateOptions;
};

function isSupportedInferenceConfigPropertyType(
  arg: unknown
): arg is SupportedModelInferenceConfigPropertiesType {
  return typeof arg === 'string' && Object.keys(MODEL_INFERENCE_CONFIG_PROPERTIES).includes(arg);
}

function isMlInferencePipelineInferenceConfig(
  arg: unknown
): arg is MLInferencePipelineInferenceConfig {
  return (
    isPopulatedObject(arg, [SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING]) ||
    isPopulatedObject(arg, [SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION])
  );
}

export function getInferencePropertiesFromPipelineConfig(
  type: string,
  pipelineConfig: estypes.IngestPipeline
): any {
  const propertiesToReturn: Record<string, any> = { [INPUT_FIELD]: '' };

  pipelineConfig.processors?.forEach((processor) => {
    const inference = processor.inference;
    if (inference) {
      // Get the input field
      if (inference.field_map) {
        for (const [key, value] of Object.entries(inference.field_map)) {
          if (value === DEFAULT_INPUT_FIELD) {
            propertiesToReturn[INPUT_FIELD] = key;
          }
        }
        if (propertiesToReturn[INPUT_FIELD] === '') {
          // If not found, set to the first field in the field map
          propertiesToReturn[INPUT_FIELD] = Object.keys(inference.field_map)[0];
        }
      }
      const inferenceConfig = inference.inference_config;
      // Get the properties associated with the type of model/task
      if (
        isMlInferencePipelineInferenceConfig(inferenceConfig) &&
        isSupportedInferenceConfigPropertyType(type)
      ) {
        MODEL_INFERENCE_CONFIG_PROPERTIES[type]?.forEach((property) => {
          const configSettings = inferenceConfig[type];
          propertiesToReturn[property] =
            configSettings && configSettings.hasOwnProperty(property)
              ? // @ts-ignore
                configSettings[property]
              : undefined;
        });
      }
    }
  });

  return propertiesToReturn;
}
