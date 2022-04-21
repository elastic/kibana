/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

import * as i18n from './translations';

export const validateCommonConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: ServiceNowPublicConfigurationType
) => {
  try {
    configurationUtilities.ensureUriAllowed(configObject.apiUrl);
  } catch (allowedListError) {
    return i18n.ALLOWED_HOSTS_ERROR(allowedListError.message);
  }
};

export const validateCommonSecrets = (
  configurationUtilities: ActionsConfigurationUtilities,
  secrets: ServiceNowSecretConfigurationType
) => {};

export const validateCommonConnector = (
  config: ServiceNowPublicConfigurationType,
  secrets: ServiceNowSecretConfigurationType
): string | null => {
  const { isOAuth, userIdentifierValue, clientId, jwtKeyId } = config;
  const { username, password, clientSecret, privateKey } = secrets;

  if (isOAuth) {
    if (userIdentifierValue == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('userIdentiferValue', true);
    }

    if (clientId == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('clientId', true);
    }

    if (jwtKeyId == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('jwtKeyId', true);
    }

    if (clientSecret == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('clientSecret', true);
    }

    if (privateKey == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('privateKey', true);
    }

    if (username || password) {
      return i18n.VALIDATE_OAUTH_POPULATED_FIELD_ERROR('Username and password', true);
    }
  } else {
    if (username == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('username', false);
    }

    if (password == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('password', false);
    }

    if (clientSecret || clientId || userIdentifierValue || jwtKeyId || privateKey) {
      return i18n.VALIDATE_OAUTH_POPULATED_FIELD_ERROR(
        'clientId, clientSecret, userIdentiferValue, jwtKeyId and privateKey',
        false
      );
    }
  }

  return null;
};

export const validate: ExternalServiceValidation = {
  config: validateCommonConfig,
  secrets: validateCommonSecrets,
  connector: validateCommonConnector,
};
