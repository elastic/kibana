/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TOKEN_INVALID = i18n.translate(
  'xpack.stackConnectors.components.slack.error.invalidWebhookUrlText',
  {
    defaultMessage: 'Token is invalid.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack..error.requiredSlackMessageText',
  {
    defaultMessage: 'Text is required.',
  }
);

export const CHANNEL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack..error.requiredSlackMessageText',
  {
    defaultMessage: 'Channel is required.',
  }
);

export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack.webhookUrlTextFieldLabel',
  {
    defaultMessage: 'App token',
  }
);
