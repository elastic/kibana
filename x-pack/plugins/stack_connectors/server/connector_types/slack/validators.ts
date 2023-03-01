/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { i18n } from '@kbn/i18n';
import { URL } from 'url';
import type { SlackSecrets, SlackConfig } from '../../../common/slack/types';

const SECRETS_DO_NOT_MATCH_SLACK_TYPE = (slackType: 'webhook' | 'web_api', secretsField: string) =>
  i18n.translate(
    'xpack.stackConnectors.slack.configuration.apiValidateSecretsDoNotMatchSlackType',
    {
      defaultMessage: 'Secrets of Slack type {slackType} should contain {secretsField} field',
      values: {
        slackType,
        secretsField,
      },
    }
  );

export const validateSecrets = (secrets: SlackSecrets, validatorServices: ValidatorServices) => {
  if (!('webhookUrl' in secrets)) return;

  const { configurationUtilities } = validatorServices;
  const configuredUrl = secrets.webhookUrl;

  try {
    new URL(configuredUrl);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationErrorNoHostname', {
        defaultMessage: 'error configuring slack action: unable to parse host name from webhookUrl',
      })
    );
  }
  try {
    configurationUtilities.ensureUriAllowed(configuredUrl);
  } catch (allowListError) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.slack.configurationError', {
        defaultMessage: 'error configuring slack action: {message}',
        values: {
          message: allowListError.message,
        },
      })
    );
  }
};

const validateConnector = (config: SlackConfig, secrets: SlackSecrets) => {
  const isWebhookType = !config?.type || config?.type === 'webhook';

  if (isWebhookType && !('webhookUrl' in secrets)) {
    return SECRETS_DO_NOT_MATCH_SLACK_TYPE('webhook', 'webhookUrl');
  }
  if (!isWebhookType && !('token' in secrets)) {
    return SECRETS_DO_NOT_MATCH_SLACK_TYPE('web_api', 'token');
  }
  return null;
};

export const validate = {
  secrets: validateSecrets,
  connector: validateConnector,
};
