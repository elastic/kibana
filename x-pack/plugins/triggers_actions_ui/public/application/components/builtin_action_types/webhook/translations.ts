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
    defaultMessage: 'URL',
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

export const BODY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);
