/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SENDER_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
  {
    defaultMessage: 'Sender is required.',
  }
);

export const SENDER_NOT_VALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.formatFromText',
  {
    defaultMessage: 'Sender is not a valid email address.',
  }
);

export const CLIENT_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredClientIdText',
  {
    defaultMessage: 'Client ID is required.',
  }
);

export const TENANT_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredTenantIdText',
  {
    defaultMessage: 'Tenant ID is required.',
  }
);

export const CLIENT_SECRET_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredClientSecretText',
  {
    defaultMessage: 'Client Secret is required.',
  }
);

export const PORT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
  {
    defaultMessage: 'Port is required.',
  }
);

export const SERVICE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredServiceText',
  {
    defaultMessage: 'Service is required.',
  }
);

export const HOST_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredHostText',
  {
    defaultMessage: 'Host is required.',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredAuthPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const PASSWORD_REQUIRED_FOR_USER_USED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPasswordText',
  {
    defaultMessage: 'Password is required when username is used.',
  }
);

export const TO_CC_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredEntryText',
  {
    defaultMessage: 'No To, Cc, or Bcc entry.  At least one entry is required.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);

export const SUBJECT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSubjectText',
  {
    defaultMessage: 'Subject is required.',
  }
);
