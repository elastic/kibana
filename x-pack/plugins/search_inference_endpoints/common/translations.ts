/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INFERENCE_ENDPOINT_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceEndpointsLabel',
  {
    defaultMessage: 'Inference Endpoints',
  }
);

export const MANAGE_INFERENCE_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
  {
    defaultMessage: 'Manage your inference endpoints.',
  }
);

export const ADD_ENDPOINT_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.newInferenceEndpointButtonLabel',
  {
    defaultMessage: 'Add endpoint',
  }
);

export const CREATE_FIRST_INFERENCE_ENDPOINT_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.createFirstInferenceEndpointDescription',
  {
    defaultMessage:
      'Connect to your third-party model provider to create an inference endpoint for semantic search.',
  }
);

export const START_WITH_PREPARED_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.startWithPreparedEndpointsLabel',
  {
    defaultMessage: 'Get started quickly with our prepared endpoints:',
  }
);

export const ELSER_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserTitle',
  {
    defaultMessage: 'ELSER',
  }
);

export const ELSER_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserDescription',
  {
    defaultMessage:
      'ELSER is a sparse vector NLP model trained by Elastic for semantic search. Recommended for English language.',
  }
);

export const E5_TITLE = i18n.translate('xpack.searchInferenceEndpoints.addEmptyPrompt.e5Title', {
  defaultMessage: 'Multilingual E5',
});

export const E5_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.e5Description',
  {
    defaultMessage:
      'E5 is a dense vector NLP model that enables you to perform multi-lingual semantic search.',
  }
);

export const ERROR_TITLE = i18n.translate('xpack.searchInferenceEndpoints.inferenceId.errorTitle', {
  defaultMessage: 'Error adding inference endpoint',
});

export const UNABLE_TO_CREATE_INFERENCE_ENDPOINT = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.unableTocreateInferenceEndpointError',
  {
    defaultMessage: 'Unable to create an inference endpoint.',
  }
);

export const INFERENCE_ENDPOINT_ALREADY_EXISTS = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.inferenceEndpointAlreadyExistsError',
  {
    defaultMessage: 'Inference Endpoint id already exists',
  }
);

export const FORBIDDEN_TO_ACCESS_TRAINED_MODELS = i18n.translate(
  'xpack.searchInferenceEndpoints.inferenceFlyoutWrapperComponent.forbiddenToAccessTrainedModelsError',
  {
    defaultMessage: 'Forbidden to access trained models',
  }
);
