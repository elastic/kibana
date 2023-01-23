/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { i18n } from '@kbn/i18n';
import { URL } from 'url';
import type { SlackSecrets } from '../../../common/slack/types';
import type { SlackServiceValidation } from './types';

export const validateCommonSecrets = (
  secrets: SlackSecrets,
  validatorServices: ValidatorServices
) => {
  if (!('webhookUrl' in secrets)) return;

  const { configurationUtilities } = validatorServices;
  const configuredUrl = secrets.webhookUrl;

  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationErrorNoHostname', {
        defaultMessage: 'Error configuring slack action: unable to parse host name from webhookUrl',
      })
    );
  }
  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationError', {
        defaultMessage: 'Error configuring slack action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }

  // Add some token validation?
};

export const validate: SlackServiceValidation = {
  secrets: validateCommonSecrets,
};
