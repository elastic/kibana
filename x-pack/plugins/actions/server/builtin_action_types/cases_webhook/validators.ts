/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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
  const configuredUrl = configObject.url;
  try {
    new URL(configuredUrl);
  } catch (err) {
    return i18n.translate(
      'xpack.actions.builtin.casesWebhook.casesWebhookConfigurationErrorNoHostname',
      {
        defaultMessage: 'error configuring cases webhook action: unable to parse url: {err}',
        values: {
          err,
        },
      }
    );
  }

  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    return i18n.translate('xpack.actions.builtin.casesWebhook.casesWebhookConfigurationError', {
      defaultMessage: 'error configuring cases webhook action: {message}',
      values: {
        message: allowListError.message,
      },
    });
  }
};

export const validateSecrets = (secrets: CasesWebhookSecretConfigurationType) => {
  // user and password must be set together (or not at all)
  if (!secrets.password && !secrets.user) return;
  if (secrets.password && secrets.user) return;
  return i18n.translate('xpack.actions.builtin.casesWebhook.invalidUsernamePassword', {
    defaultMessage: 'both user and password must be specified',
  });
};

export const validate: ExternalServiceValidation = {
  config: validateConfig,
  secrets: validateSecrets,
};
