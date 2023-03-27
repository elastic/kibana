/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { i18n } from '@kbn/i18n';
import { URL } from 'url';
import type { SlackSecrets, SlackConfig, SlackActionParams } from '../../../common/slack/types';

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

const SLACK_CONNECTOR_WITH_TYPE_SHOULD_INCLUDE_FIELD = (
  slackTypeName: 'Webhook' | 'Web API',
  paramsField: string
) =>
  i18n.translate(
    'xpack.stackConnectors.slack.configuration.slackConnectorWithTypeShouldIncludeField',
    {
      defaultMessage:
        'Slack connector parameters with type {slackTypeName} should include {paramsField} field in parameters',
      values: {
        slackTypeName,
        paramsField,
      },
    }
  );

const WRONG_SUBACTION = () =>
  i18n.translate('xpack.stackConnectors.slack.configuration.slackConnectorWrongSubAction', {
    defaultMessage: 'subAction can be only postMesage or getChannels',
  });

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

const validateTypeParamsCombination = (type: 'webhook' | 'web_api', params: SlackActionParams) => {
  if (type === 'webhook') {
    if (!('message' in params)) {
      throw new Error(SLACK_CONNECTOR_WITH_TYPE_SHOULD_INCLUDE_FIELD('Webhook', 'message'));
    }
    return true;
  }
  if (type === 'web_api') {
    if (!('subAction' in params)) {
      throw new Error(SLACK_CONNECTOR_WITH_TYPE_SHOULD_INCLUDE_FIELD('Web API', 'subAction'));
    }
    if (params.subAction !== 'postMessage' && params.subAction !== 'getChannels') {
      throw new Error(WRONG_SUBACTION());
    }
  }
  return;
};

export const validate = {
  secrets: validateSecrets,
  connector: validateConnector,
  validateTypeParamsCombination,
};
