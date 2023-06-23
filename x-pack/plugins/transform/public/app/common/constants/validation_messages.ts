/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const numberRangeMinus1To100NotValidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.numberGreaterThanOrEqualToNegativeOneNotValidErrorMessage',
  {
    defaultMessage: 'Number of retries needs to be between 0 and 100, or -1 for infinite retries.',
  }
);

export const numberRange10To10000NotValidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.numberRange10To10000NotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be an integer between 10 and 10000.',
  }
);

export const pageSearchSizeInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.maxPageSearchSizeInvalidMessage',
  {
    defaultMessage: 'Maximum page search size needs to be an integer between 10 and 65536.',
  }
);

// Retention policy max age validator
export const retentionPolicyMaxAgeInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.retentionPolicyMaxAgeInvalidMessage',
  {
    defaultMessage: 'Invalid max age format. Minimum of 60s required.',
  }
);

// xpack.transform.transformList.numberOfRetriesInvalidErrorMessage
export const numberOfRetriesInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingsValidations.numberOfRetriesInvalidErrorMessage',
  {
    defaultMessage: 'Number of retries needs to be between 0 and 100, or -1 for infinite retries.',
  }
);
