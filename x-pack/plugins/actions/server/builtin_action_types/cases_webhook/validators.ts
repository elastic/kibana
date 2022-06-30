/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../../actions_config';
import {
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExternalServiceValidation,
} from './types';

const validateConfig = (
  configurationUtilities: ActionsConfigurationUtilities,
  configObject: CasesWebhookPublicConfigurationType
) => {
  const {
    createCommentUrl,
    createIncidentUrl,
    incidentViewUrl,
    getIncidentUrl,
    updateIncidentUrl,
  } = configObject;

  try {
    new URL(createIncidentUrl);
  } catch (err) {
    return i18n.INVALID_URL(err, 'createIncidentUrl');
  }

  try {
    configurationUtilities.ensureUriAllowed(createIncidentUrl);
  } catch (allowListError) {
    return i18n.CONFIG_ERR(allowListError.message);
  }
  if (createCommentUrl) {
    try {
      new URL(createCommentUrl);
    } catch (err) {
      return i18n.INVALID_URL(err, 'createCommentUrl');
    }

    try {
      configurationUtilities.ensureUriAllowed(createCommentUrl);
    } catch (allowListError) {
      return i18n.CONFIG_ERR(allowListError.message);
    }
  }

  try {
    new URL(incidentViewUrl);
  } catch (err) {
    return i18n.INVALID_URL(err, 'incidentViewUrl');
  }

  try {
    configurationUtilities.ensureUriAllowed(incidentViewUrl);
  } catch (allowListError) {
    return i18n.CONFIG_ERR(allowListError.message);
  }
  try {
    new URL(getIncidentUrl);
  } catch (err) {
    return i18n.INVALID_URL(err, 'getIncidentUrl');
  }

  try {
    configurationUtilities.ensureUriAllowed(getIncidentUrl);
  } catch (allowListError) {
    return i18n.CONFIG_ERR(allowListError.message);
  }
  try {
    new URL(updateIncidentUrl);
  } catch (err) {
    return i18n.INVALID_URL(err, 'updateIncidentUrl');
  }

  try {
    configurationUtilities.ensureUriAllowed(updateIncidentUrl);
  } catch (allowListError) {
    return i18n.CONFIG_ERR(allowListError.message);
  }
};

export const validateSecrets = (secrets: CasesWebhookSecretConfigurationType) => {
  // user and password must be set together (or not at all)
  if (!secrets.password && !secrets.user) return;
  if (secrets.password && secrets.user) return;
  return i18n.INVALID_USER_PW;
};

export const validate: ExternalServiceValidation = {
  config: validateConfig,
  secrets: validateSecrets,
};
