/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const METHOD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.methodTextFieldLabel',
  {
    defaultMessage: 'Method',
  }
);

export const HAS_AUTH_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
  }
);

export const URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.urlTextFieldLabel',
  {
    defaultMessage: 'Torq endpoint URL',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const ADD_HEADERS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.viewHeadersSwitch',
  {
    defaultMessage: 'Add HTTP header',
  }
);

export const HEADER_KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.headerKeyTextFieldLabel',
  {
    defaultMessage: 'Key',
  }
);

export const REMOVE_ITEM_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.removeHeaderIconLabel',
  {
    defaultMessage: 'Key',
  }
);

export const ADD_HEADER_BTN = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.addHeaderButtonLabel',
  {
    defaultMessage: 'Add header',
  }
);

export const HEADER_VALUE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.headerValueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.invalidUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const URL_NOT_TORQ_WEBHOOK = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.torqAction.error.urlIsNotTorqWebhook',
  {
    defaultMessage: 'URL is not a Torq integration endpoint.',
  }
);

export const METHOD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredMethodText',
  {
    defaultMessage: 'Method is required.',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const TORQ_TOKEN_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.torqAction.token',
  {
    defaultMessage: 'Torq webhook authentication header secret',
  }
);

export const TORQ_TOKEN_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.torqAction.errors.tokenRequired',
  {
    defaultMessage: 'Torq integration token is required.',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);

export const TORQ_TOKEN_HELP_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.torq.tokenHelpText',
  {
    defaultMessage: 'Enter the webhook authentication header secret generated when you created the Elastic Security integration.',
  }
);

export const URL_HELP_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.torq.urlHelpText',
  {
    defaultMessage: 'Enter the endpoint URL generated when you created the Elastic Security integration on Torq.',
  }
);

export const TORQ_HOW_TO_TEXT = i18n.translate(
  'xpack.triggersActionsUI.components.torq.torqActionConnectorFields.calloutTitle', // TODO: translations
  {
    defaultMessage:
      'Create an Elastic Security integration on Torq, and then come back and paste the endpoint URL and token generated for your integration.',
  }
);
