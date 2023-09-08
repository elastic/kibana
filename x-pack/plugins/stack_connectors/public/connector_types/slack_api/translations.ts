/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.requiredSlackMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);
export const CHANNEL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.slack_api.error.requiredSlackChannel',
  {
    defaultMessage: 'Channel is required.',
  }
);
export const TOKEN_LABEL = i18n.translate(
  'xpack.stackConnectors.components.slack_api.tokenTextFieldLabel',
  {
    defaultMessage: 'API Token',
  }
);
export const WEB_API = i18n.translate('xpack.stackConnectors.components.slack_api.webApi', {
  defaultMessage: 'Web API',
});
export const SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.components.slack_api.selectMessageText',
  {
    defaultMessage: 'Send messages to Slack channels.',
  }
);
export const ACTION_TYPE_TITLE = i18n.translate(
  'xpack.stackConnectors.components.slack_api.connectorTypeTitle',
  {
    defaultMessage: 'Send to Slack',
  }
);
export const ALLOWED_CHANNELS = i18n.translate(
  'xpack.stackConnectors.components.slack_api.allowedChannelsLabel',
  {
    defaultMessage: 'Channels',
  }
);
export const SUCCESS_FETCH_CHANNELS = i18n.translate(
  'xpack.stackConnectors.components.slack_api.successFetchChannelsText',
  {
    defaultMessage: 'Fetch all channels',
  }
);

export const ERROR_FETCH_CHANNELS = i18n.translate(
  'xpack.stackConnectors.components.slack_api.errorFetchChannelsText',
  {
    defaultMessage: 'Cannot fetch channels, please check the validity of your token',
  }
);
