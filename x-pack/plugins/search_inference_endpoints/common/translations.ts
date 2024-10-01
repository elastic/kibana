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
    defaultMessage: 'Inference endpoints',
  }
);

export const CANCEL = i18n.translate('xpack.searchInferenceEndpoints.cancel', {
  defaultMessage: 'Cancel',
});

export const MANAGE_INFERENCE_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
  {
    defaultMessage:
      'Inference endpoints streamline the deployment and management of machine\nlearning models in Elasticsearch. Set up and manage NLP tasks using unique\nendpoints, to build AI-powered search.',
  }
);

export const CREATE_FIRST_INFERENCE_ENDPOINT_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.createFirstInferenceEndpointDescription',
  {
    defaultMessage:
      "Inference endpoints enable you to perform inference tasks using NLP models provided by third-party services or Elastic's built-in models like ELSER and E5. Set up tasks such as text embedding, completions, reranking, and more by using the Create Inference API.",
  }
);

export const START_WITH_PREPARED_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.startWithPreparedEndpointsLabel',
  {
    defaultMessage: 'Learn more about built-in NLP models:',
  }
);

export const ELSER_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserTitle',
  {
    defaultMessage: 'ELSER',
  }
);

export const LEARN_HOW_TO_CREATE_INFERENCE_ENDPOINTS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.learnHowToCreateInferenceEndpoints',
  {
    defaultMessage: 'Learn how to create inference endpoints',
  }
);

export const SEMANTIC_SEARCH_WITH_ELSER_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.semanticSearchWithElser',
  {
    defaultMessage: 'Semantic search with ELSER',
  }
);

export const SEMANTIC_SEARCH_WITH_E5_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.semanticSearchWithE5',
  {
    defaultMessage: 'Semantic search with E5 Multilingual',
  }
);

export const VIEW_YOUR_MODELS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.viewYourModels',
  {
    defaultMessage: 'ML Trained Models',
  }
);

export const API_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.apiDocumentationLink',
  {
    defaultMessage: 'API Documentation',
  }
);

export const ELSER_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserDescription',
  {
    defaultMessage: "ELSER is Elastic's sparse vector NLP model for semantic search in English.",
  }
);

export const E5_TITLE = i18n.translate('xpack.searchInferenceEndpoints.addEmptyPrompt.e5Title', {
  defaultMessage: 'E5 Multilingual',
});

export const E5_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.e5Description',
  {
    defaultMessage:
      'E5 is a third-party NLP model that enables you to perform multilingual semantic search by using dense vector representations.',
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

export const ENDPOINT_ADDED_SUCCESS = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.endpointAddedSuccess',
  {
    defaultMessage: 'Endpoint added',
  }
);

export const ENDPOINT_CREATION_FAILED = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.endpointAddedFailure',
  {
    defaultMessage: 'Endpoint creation failed',
  }
);

export const ENDPOINT_ADDED_SUCCESS_DESCRIPTION = (endpointId: string) =>
  i18n.translate('xpack.searchInferenceEndpoints.actions.endpointAddedSuccessDescription', {
    defaultMessage: 'The inference endpoint "{endpointId}" was added.',
    values: { endpointId },
  });

export const ENDPOINT = i18n.translate('xpack.searchInferenceEndpoints.endpoint', {
  defaultMessage: 'Endpoint',
});

export const SERVICE_PROVIDER = i18n.translate('xpack.searchInferenceEndpoints.serviceProvider', {
  defaultMessage: 'Service',
});

export const TASK_TYPE = i18n.translate('xpack.searchInferenceEndpoints.taskType', {
  defaultMessage: 'Type',
});

export const TRAINED_MODELS_STAT_GATHER_FAILED = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.trainedModelsStatGatherFailed',
  {
    defaultMessage: 'Failed to retrieve trained model statistics',
  }
);
