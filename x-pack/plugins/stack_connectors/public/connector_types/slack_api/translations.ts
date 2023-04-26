/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack.error.requiredSlackMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);
export const CHANNEL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack.error.requiredSlackChannel',
  {
    defaultMessage: 'Selected channel is required.',
  }
);
export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack.tokenTextFieldLabel',
  {
    defaultMessage: 'API Token',
  }
);
export const WEB_API = i18n.translate('xpack.stackConnectors.components.slack.webApi', {
  defaultMessage: 'Web API',
});
export const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.slack.selectMessageText',
  {
    defaultMessage: 'Send a message to a Slack channel or user.',
  }
);
export const ACTION_TYPE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.slack.connectorTypeTitle',
  {
    defaultMessage: 'Send to Slack',
  }
);
