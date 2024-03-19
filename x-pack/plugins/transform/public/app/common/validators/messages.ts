/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Retention policy max age validator
export const retentionPolicyMaxAgeInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.retentionPolicyMaxAgeInvalidMessage',
  {
    defaultMessage: 'Invalid max age format. Minimum of 60s required.',
  }
);

export const requiredErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormRequiredErrorMessage',
  {
    defaultMessage: 'Required field.',
  }
);

export const stringNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormStringNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be of type string.',
  }
);

export const frequencyNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormFrequencyNotValidErrorMessage',
  {
    defaultMessage: 'The frequency value is not valid.',
  }
);
