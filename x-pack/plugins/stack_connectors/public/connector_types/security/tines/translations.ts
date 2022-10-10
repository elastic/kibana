/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.urlTextFieldLabel',
  {
    defaultMessage: 'Tenant URL',
  }
);

export const EMAIL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.emailTextFieldLabel',
  {
    defaultMessage: 'Email',
  }
);
export const TOKEN_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.tokenTextFieldLabel',
  {
    defaultMessage: 'Auth token',
  }
);

export const URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.tinesAction.error.invalidUrlTextField',
  {
    defaultMessage: 'Tenant URL is invalid.',
  }
);

export const EMAIL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.tinesAction.error.requiredEmailText',
  {
    defaultMessage: 'Email is required.',
  }
);
export const TOKEN_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.sections.addAction.tinesAction.error.requiredAuthTokenText',
  {
    defaultMessage: 'Auth token is required.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);

export const BODY_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.invalidBodyText',
  {
    defaultMessage: 'Body does not have a valid JSON format.',
  }
);

export const STORY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredStoryText',
  {
    defaultMessage: 'Story is required.',
  }
);
export const WEBHOOK_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookText',
  {
    defaultMessage: 'Webhook is required.',
  }
);
export const WEBHOOK_PATH_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookPathText',
  {
    defaultMessage: 'Webhook action path missing.',
  }
);
export const WEBHOOK_SECRET_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookSecretText',
  {
    defaultMessage: 'Webhook action secret is missing.',
  }
);
