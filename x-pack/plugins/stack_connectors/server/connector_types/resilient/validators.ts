/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ResilientPublicConfigurationType,
  ResilientSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

import * as i18n from './translations';

export const validateCommonConfig = (
  configObject: ResilientPublicConfigurationType,
  validatorServices: ValidatorServices
) => {
  const { configurationUtilities } = validatorServices;
  try {
    configurationUtilities.ensureUriAllowed(configObject.apiUrl);
  } catch (allowedListError) {
    throw new Error(i18n.ALLOWED_HOSTS_ERROR(allowedListError.message));
  }
};

export const validateCommonSecrets = (
  secrets: ResilientSecretConfigurationType,
  validatorServices: ValidatorServices
) => {};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};
