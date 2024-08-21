/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WEBHOOK_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.teams.error.webhookUrlTextLabel',
  {
    defaultMessage: 'Webhook URL',
  }
);

export const WEBHOOK_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.teams.error.invalidWebhookUrlText',
  {
    defaultMessage: 'Webhook URL is invalid.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.teams.error.requiredMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);

export const WEBHOOK_DEPRECATION_WARNING = i18n.translate(
  'xpack.stackConnectors.components.teams.warning.webhookDeprecation',
  {
    defaultMessage:
      'Microsoft has deprecated the old way of configuring Webhooks. If you have not updated it yet the Webhook URL will stop working in December 2024. Please follow the documentation link to configure it again.',
  }
);
