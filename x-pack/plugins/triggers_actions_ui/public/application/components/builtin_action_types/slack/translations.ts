/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WEBHOOK_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requiredWebhookUrlText',
  {
    defaultMessage: 'Webhook URL is required.',
  }
);

export const WEBHOOK_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.invalidWebhookUrlText',
  {
    defaultMessage: 'Webhook URL is invalid.',
  }
);

export const WEBHOOK_URL_HTTP_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requireHttpsWebhookUrlText',
  {
    defaultMessage: 'Webhook URL must start with https://.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSlackMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);
