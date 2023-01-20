/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WEBHOOK_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.slack.error.invalidWebhookUrlText',
  {
    defaultMessage: 'Webhook URL is invalid.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack..error.requiredSlackMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);

export const CHANNEL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack..error.requiredSlackMessageText',
  {
    defaultMessage: 'At least one selected channel is required.',
  }
);

export const WEBHOOK_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack.webhookUrlTextFieldLabel',
  {
    defaultMessage: 'Webhook URL',
  }
);

export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack.tokenTextFieldLabel',
  {
    defaultMessage: 'Api token',
  }
);

export const URL_TEXT = i18n.translate('xpack.stackConnectors.components.slack.urlFieldLabel', {
  defaultMessage: 'URL',
});

// new

export const BASIC_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.connectorSettingsLabel',
  {
    defaultMessage: 'Select the Webhook or Web API slack communication type',
  }
);

export const BASIC_AUTH_BUTTON_GROUP_LEGEND = i18n.translate(
  'xpack.stackConnectors.components.xmatters.basicAuthButtonGroupLegend',
  {
    defaultMessage: 'Slack type',
  }
);

export const WEBHOOK = i18n.translate('xpack.stackConnectors.components.slack.webhook', {
  defaultMessage: 'Webhook',
});

export const WEB_API = i18n.translate('xpack.stackConnectors.components.slack.webApi', {
  defaultMessage: 'Web API',
});
