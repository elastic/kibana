/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { i18n } from '@kbn/i18n';
import type { IngestInferenceProcessor } from '@elastic/elasticsearch/lib/api/types';
import type { SupportedPytorchTasksType } from '@kbn/ml-trained-models-utils';
import type { InferenceModelTypes } from './types';
import type { AddInferencePipelineFormErrors } from './types';

const INVALID_PIPELINE_NAME_ERROR = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.invalidPipelineName',
  {
    defaultMessage: 'Name must only contain letters, numbers, underscores, and hyphens.',
  }
);
const FIELD_REQUIRED_ERROR = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.emptyValueError',
  {
    defaultMessage: 'Field is required.',
  }
);
const NO_EMPTY_INFERENCE_CONFIG_OBJECT = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.noEmptyInferenceConfigObjectError',
  {
    defaultMessage: 'Inference configuration cannot be an empty object.',
  }
);
const PIPELINE_NAME_EXISTS_ERROR = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.pipelineNameExistsError',
  {
    defaultMessage: 'Name already used by another pipeline.',
  }
);
const FIELD_MAP_REQUIRED_FIELDS_ERROR = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.emptyValueError',
  {
    defaultMessage: 'Field map must include fields expected by the model.',
  }
);
const INFERENCE_CONFIG_MODEL_TYPE_ERROR = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.advanced.incorrectModelTypeError',
  {
    defaultMessage: 'Inference configuration inference type must match model type.',
  }
);
const PROCESSOR_REQUIRED = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.processorRequiredError',
  {
    defaultMessage: 'At least one processor is required to create the pipeline.',
  }
);
const INFERENCE_PROCESSOR_REQUIRED = i18n.translate(
  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.inferenceProcessorRequiredError',
  {
    defaultMessage: "An inference processor specifying 'model_id' is required.",
  }
);

const VALID_PIPELINE_NAME_REGEX = /^[\w\-]+$/;
export const isValidPipelineName = (input: string): boolean => {
  return input.length > 0 && VALID_PIPELINE_NAME_REGEX.test(input);
};

export const validateInferencePipelineConfigurationStep = (
  pipelineName: string,
  pipelineNames: string[]
) => {
  const errors: AddInferencePipelineFormErrors = {};

  if (pipelineName.trim().length === 0 || pipelineName === '') {
    errors.pipelineName = FIELD_REQUIRED_ERROR;
  } else if (!isValidPipelineName(pipelineName)) {
    errors.pipelineName = INVALID_PIPELINE_NAME_ERROR;
  }

  const pipelineNameExists = pipelineNames.find((name) => name === pipelineName) !== undefined;

  if (pipelineNameExists) {
    errors.pipelineName = PIPELINE_NAME_EXISTS_ERROR;
  }

  return errors;
};

export const validateInferenceConfig = (
  inferenceConfig: IngestInferenceProcessor['inference_config'],
  modelType?: InferenceModelTypes | SupportedPytorchTasksType
) => {
  const inferenceConfigKeys = Object.keys(inferenceConfig ?? {});
  let error;

  // If inference config has been changed, it cannot be an empty object
  if (inferenceConfig && Object.keys(inferenceConfig).length === 0) {
    error = NO_EMPTY_INFERENCE_CONFIG_OBJECT;
    return error;
  }

  // If populated, inference config must have the correct model type
  if (modelType && inferenceConfig && inferenceConfigKeys.length > 0) {
    if (modelType === inferenceConfigKeys[0]) {
      return error;
    } else {
      error = INFERENCE_CONFIG_MODEL_TYPE_ERROR;
    }
    return error;
  }
  return error;
};

export const validateFieldMap = (
  modelInputFields: string[],
  fieldMap: IngestInferenceProcessor['field_map']
) => {
  let error;
  const fieldMapValues: string[] = Object.values(fieldMap?.field_map ?? {});

  // If populated, field map must include at least some model input fields as values.
  if (fieldMap && fieldMapValues.length > 0) {
    if (fieldMapValues.some((v) => modelInputFields.includes(v))) {
      return error;
    } else {
      error = FIELD_MAP_REQUIRED_FIELDS_ERROR;
    }
  }

  return error;
};

export const validatePipelineProcessors = (
  pipelineProcessors: estypes.IngestPipeline,
  taskType?: SupportedPytorchTasksType
) => {
  const { processors } = pipelineProcessors;
  let error;
  // Must have at least one processor
  if (!Array.isArray(processors) || (Array.isArray(processors) && processors.length < 1)) {
    error = PROCESSOR_REQUIRED;
  }

  const inferenceProcessor = processors?.find(
    (processor) => processor.inference && processor.inference.model_id
  );

  if (inferenceProcessor === undefined) {
    error = INFERENCE_PROCESSOR_REQUIRED;
  } else {
    // If populated, inference config must have the correct model type
    const inferenceConfig = inferenceProcessor.inference?.inference_config;
    if (taskType && inferenceConfig) {
      error = validateInferenceConfig(inferenceConfig, taskType);
    }
  }

  return error;
};
