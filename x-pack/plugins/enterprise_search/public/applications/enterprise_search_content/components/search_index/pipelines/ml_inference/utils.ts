/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { SUPPORTED_PYTORCH_TASKS } from '@kbn/ml-trained-models-utils';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';

const VALID_PIPELINE_NAME_REGEX = /^[\w\-]+$/;
export const isValidPipelineName = (input: string): boolean => {
  return input.length > 0 && VALID_PIPELINE_NAME_REGEX.test(input);
};

const INVALID_PIPELINE_NAME_ERROR = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.invalidPipelineName',
  {
    defaultMessage: 'Name must only contain letters, numbers, underscores, and hyphens.',
  }
);
const FIELD_REQUIRED_ERROR = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.emptyValueError',
  {
    defaultMessage: 'Field is required.',
  }
);

export const validateInferencePipelineConfiguration = (
  config: InferencePipelineConfiguration
): AddInferencePipelineFormErrors => {
  const errors: AddInferencePipelineFormErrors = {};
  if (config.existingPipeline === true) {
    if (config.pipelineName.length === 0) {
      errors.pipelineName = FIELD_REQUIRED_ERROR;
    }
    return errors;
  }
  if (config.pipelineName.trim().length === 0) {
    errors.pipelineName = FIELD_REQUIRED_ERROR;
  } else if (!isValidPipelineName(config.pipelineName)) {
    errors.pipelineName = INVALID_PIPELINE_NAME_ERROR;
  }
  if (config.modelID.trim().length === 0) {
    errors.modelID = FIELD_REQUIRED_ERROR;
  }

  return errors;
};

export const validateInferencePipelineFields = (
  config: InferencePipelineConfiguration
): AddInferencePipelineFormErrors => {
  const errors: AddInferencePipelineFormErrors = {};

  // If there are field mappings, we don't need to validate the single source field
  if (config.fieldMappings && Object.keys(config.fieldMappings).length > 0) {
    return errors;
  }

  if (config.sourceField.trim().length === 0) {
    errors.sourceField = FIELD_REQUIRED_ERROR;
  }

  return errors;
};

export const EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.disabledSourceFieldDescription',
  {
    defaultMessage:
      'This pipeline cannot be selected because the source field does not exist on this index.',
  }
);

export const EXISTING_PIPELINE_DISABLED_PIPELINE_EXISTS = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.disabledPipelineExistsDescription',
  {
    defaultMessage: 'This pipeline cannot be selected because it is already attached.',
  }
);

export const EXISTING_PIPELINE_DISABLED_TEXT_EXPANSION = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.existingPipeline.disabledElserNotSupportedDescription',
  {
    defaultMessage:
      'This pipeline cannot be selected because attaching an ELSER pipeline is not supported yet.',
  }
);

export const getDisabledReason = (
  sourceFields: string[] | undefined,
  sourceField: string,
  indexProcessorNames: string[],
  pipelineName: string,
  modelType: string
): string | undefined => {
  if (!(sourceFields?.includes(sourceField) ?? false)) {
    return EXISTING_PIPELINE_DISABLED_MISSING_SOURCE_FIELD;
  } else if (indexProcessorNames.includes(pipelineName)) {
    return EXISTING_PIPELINE_DISABLED_PIPELINE_EXISTS;
  } else if (modelType === SUPPORTED_PYTORCH_TASKS.TEXT_EXPANSION) {
    return EXISTING_PIPELINE_DISABLED_TEXT_EXPANSION;
  }

  return undefined;
};

export const MODEL_SELECT_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.model.placeholder',
  { defaultMessage: 'Select a model' }
);

export const MODEL_REDACTED_VALUE = i18n.translate(
  'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.model.redactedValue',
  { defaultMessage: "This model isn't available in the Kibana space" }
);
