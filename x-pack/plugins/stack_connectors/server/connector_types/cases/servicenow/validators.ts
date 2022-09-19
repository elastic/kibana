/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

import * as i18n from './translations';

export const validateCommonConfig = (
  config: ServiceNowPublicConfigurationType,
  validatorServices: ValidatorServices
) => {
  const { isOAuth, apiUrl, userIdentifierValue, clientId, jwtKeyId } = config;
  const { configurationUtilities } = validatorServices;
  try {
    configurationUtilities.ensureUriAllowed(apiUrl);
  } catch (allowedListError) {
    throw new Error(i18n.ALLOWED_HOSTS_ERROR(allowedListError.message));
  }

  if (isOAuth) {
    if (userIdentifierValue == null) {
      throw new Error(i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('userIdentifierValue', true));
    }

    if (clientId == null) {
      throw new Error(i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('clientId', true));
    }

    if (jwtKeyId == null) {
      throw new Error(i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('jwtKeyId', true));
    }
  }
};

export const validateCommonSecrets = (
  secrets: ServiceNowSecretConfigurationType,
  validatorServices: ValidatorServices
) => {
  const { username, password, clientSecret, privateKey } = secrets;

  if (!username && !password && !clientSecret && !privateKey) {
    throw new Error(i18n.CREDENTIALS_ERROR);
  }

  if (username || password) {
    // Username and password must be set and set together
    if (!username || !password) {
      throw new Error(i18n.BASIC_AUTH_CREDENTIALS_ERROR);
    }
  } else if (clientSecret || privateKey) {
    // Client secret and private key must be set and set together
    if (!clientSecret || !privateKey) {
      throw new Error(i18n.OAUTH_CREDENTIALS_ERROR);
    }
  }
};

export const validateCommonConnector = (
  config: ServiceNowPublicConfigurationType,
  secrets: ServiceNowSecretConfigurationType
): string | null => {
  const { isOAuth, userIdentifierValue, clientId, jwtKeyId } = config;
  const { username, password, clientSecret, privateKey } = secrets;

  if (isOAuth) {
    if (userIdentifierValue == null) {
      return i18n.VALIDATE_OAUTH_MISSING_FIELD_ERROR('userIdentifierValue', true);
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
        'clientId, clientSecret, userIdentifierValue, jwtKeyId and privateKey',
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
