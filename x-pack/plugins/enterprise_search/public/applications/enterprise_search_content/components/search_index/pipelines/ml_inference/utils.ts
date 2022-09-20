/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TrainedModelConfigResponse } from '@kbn/ml-plugin/common/types/trained_models';

import { AddInferencePipelineFormErrors, InferencePipelineConfiguration } from './types';

const NLP_CONFIG_KEYS = [
  'ner',
  'classification',
  'text_classification',
  'text_embedding',
  'zero_shot_classification',
];
export const isSupportedMLModel = (model: TrainedModelConfigResponse): boolean => {
  return Object.keys(model.inference_config).some((key) => NLP_CONFIG_KEYS.includes(key));
};

const RECOMMENDED_FIELDS = ['body', 'body_content', 'title'];
export const sortSourceFields = (a: string, b: string): number => {
  const promoteA = RECOMMENDED_FIELDS.includes(a);
  const promoteB = RECOMMENDED_FIELDS.includes(b);
  if (promoteA && promoteB) {
    return RECOMMENDED_FIELDS.indexOf(a) > RECOMMENDED_FIELDS.indexOf(b) ? 1 : -1;
  } else if (promoteA) {
    return -1;
  } else if (promoteB) {
    return 1;
  }
  return a.localeCompare(b);
};

const VALID_PIPELINE_NAME_REGEX = /^[\w\-]+$/;
export const isValidPipelineName = (input: string): boolean => {
  return input.length > 0 && VALID_PIPELINE_NAME_REGEX.test(input);
};

export const validateInferencePipelineConfiguration = (
  config: InferencePipelineConfiguration
): AddInferencePipelineFormErrors | undefined => {
  const errors: AddInferencePipelineFormErrors = {};
  if (!isValidPipelineName(config.pipelineName)) {
    errors.pipelineName = i18n.translate(
      'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.configure.invalidPipelineName',
      {
        defaultMessage: 'Name must only contain letters, numbers, underscores, and hyphens.',
      }
    );
    return errors;
  }
};
