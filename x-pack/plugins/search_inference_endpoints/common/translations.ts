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

export const CANCEL = i18n.translate('xpack.searchInferenceEndpoints.cancel', {
  defaultMessage: 'Cancel',
});

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
      "Inference endpoints streamline the deployment and management of machine learning models in Elasticsearch. Set up tasks such as text embedding, completions, and reranking using simple, unique endpoints. Use Elastic's built-in models, connect to third-party services via API, or integrate models uploaded with Python.",
  }
);

export const START_WITH_PREPARED_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.startWithPreparedEndpointsLabel',
  {
    defaultMessage: 'Get started quickly with our prepared built-in ML models:',
  }
);

export const ELSER_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserTitle',
  {
    defaultMessage: 'ELSER',
  }
);

export const LEARN_MORE_ABOUT_INFERENCE_ENDPOINTS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.learnMoreAboutInferenceEndpoints',
  {
    defaultMessage: 'Learn more about inference endpoints',
  }
);

export const VIEW_YOUR_MODELS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.viewYourModels',
  {
    defaultMessage: 'View your models',
  }
);

export const ELSER_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.elserDescription',
  {
    defaultMessage: "ELSER is Elastic's sparse vector NLP model for English semantic search.",
  }
);

export const E5_TITLE = i18n.translate('xpack.searchInferenceEndpoints.addEmptyPrompt.e5Title', {
  defaultMessage: 'Multilingual E5',
});

export const E5_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.addEmptyPrompt.e5Description',
  {
    defaultMessage:
      'E5 is a third party NLP model that enables you to perform multi-lingual semantic search by using dense vector representations.',
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

export const COPY_ID_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.copyID',
  {
    defaultMessage: 'Copy endpoint ID',
  }
);

export const COPY_ID_ACTION_SUCCESS = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.copyIDSuccess',
  {
    defaultMessage: 'Inference endpoint ID copied!',
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

export const DELETE_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.deleteSingleEndpoint',
  {
    defaultMessage: 'Delete endpoint',
  }
);

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
