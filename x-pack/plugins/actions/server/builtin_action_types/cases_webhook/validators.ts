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

  const urls = [
    createCommentUrl,
    createIncidentUrl,
    incidentViewUrl,
    getIncidentUrl,
    updateIncidentUrl,
  ];

  for (const url of urls) {
    if (url) {
      try {
        new URL(url);
      } catch (err) {
        return i18n.INVALID_URL(err, url);
      }
      try {
        configurationUtilities.ensureUriAllowed(url);
      } catch (allowListError) {
        return i18n.CONFIG_ERR(allowListError.message);
      }
    }
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
