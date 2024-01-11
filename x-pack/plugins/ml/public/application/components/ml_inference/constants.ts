/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_INFERENCE_PIPELINE_STEPS = {
  DETAILS: 'Details',
  CONFIGURE_PROCESSOR: 'Configure processor',
  ON_FAILURE: 'Failure handling',
  TEST: 'Test',
  CREATE: 'create',
} as const;

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.ml.trainedModels.actions.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export const CLEAR_BUTTON_LABEL = i18n.translate(
  'xpack.ml.trainedModels.actions.clearButtonLabel',
  { defaultMessage: 'Clear' }
);

export const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.ml.trainedModels.actions.closeButtonLabel',
  { defaultMessage: 'Close' }
);

export const BACK_BUTTON_LABEL = i18n.translate('xpack.ml.trainedModels.actions.backButtonLabel', {
  defaultMessage: 'Back',
});

export const CONTINUE_BUTTON_LABEL = i18n.translate(
  'xpack.ml.trainedModels.actions.continueButtonLabel',
  { defaultMessage: 'Continue' }
);

export const EDIT_MESSAGE = i18n.translate(
  'xpack.ml.trainedModels.actions.create.advancedDetails.editButtonText',
  {
    defaultMessage: 'Edit',
  }
);

export const CREATE_FIELD_MAPPING_MESSAGE = i18n.translate(
  'xpack.ml.trainedModels.actions.create.advancedDetails.createFieldMapText',
  {
    defaultMessage: 'Create field map',
  }
);

export const CANCEL_EDIT_MESSAGE = i18n.translate(
  'xpack.ml.trainedModels.actions.create.advancedDetails.cancelEditButtonText',
  {
    defaultMessage: 'Cancel',
  }
);
