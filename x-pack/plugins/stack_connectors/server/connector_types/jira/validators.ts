/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  JiraPublicConfigurationType,
  JiraSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

import * as i18n from './translations';
import { MAX_OTHER_FIELDS_LENGTH } from './constants';
import { incidentSchemaObjectProperties } from './schema';

export const validateCommonConfig = (
  configObject: JiraPublicConfigurationType,
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
  secrets: JiraSecretConfigurationType,
  validatorServices: ValidatorServices
) => {};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
};

export const validateOtherFieldsLength = (
  otherFields: Record<string, unknown>
): string | undefined => {
  if (Object.keys(otherFields).length > MAX_OTHER_FIELDS_LENGTH) {
    return i18n.OTHER_FIELDS_LENGTH_ERROR(MAX_OTHER_FIELDS_LENGTH);
  }
};

export const validateOtherFieldsKeys = (key: string): string | undefined => {
  const propertiesSet = new Set(incidentSchemaObjectProperties);

  if (propertiesSet.has(key)) {
    return i18n.OTHER_FIELDS_PROPERTY_ERROR(key);
  }
};
