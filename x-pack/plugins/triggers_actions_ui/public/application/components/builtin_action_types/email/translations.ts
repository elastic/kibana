/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USERNAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.passwordFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const FROM_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.fromTextFieldLabel',
  {
    defaultMessage: 'Sender',
  }
);

export const SERVICE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.serviceTextFieldLabel',
  {
    defaultMessage: 'Service',
  }
);

export const TENANT_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.tenantIdFieldLabel',
  {
    defaultMessage: 'Tenant ID',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.clientIdFieldLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Client Secret',
  }
);

export const HOST_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hostTextFieldLabel',
  {
    defaultMessage: 'Host',
  }
);

export const PORT_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.portTextFieldLabel',
  {
    defaultMessage: 'Port',
  }
);

export const SECURE_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.secureSwitchLabel',
  {
    defaultMessage: 'Secure',
  }
);

export const HAS_AUTH_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this server',
  }
);

export const SENDER_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredFromText',
  {
    defaultMessage: 'Sender is required.',
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

export const PORT_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredPortText',
  {
    defaultMessage: 'Port is required.',
  }
);

export const PORT_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.error.invalidPortText',
  {
    defaultMessage: 'Port is invalid.',
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

export function getInvalidEmailAddress(email: string) {
  return i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.error.invalidEmail',
    {
      defaultMessage: 'Email address {email} is not valid.',
      values: { email },
    }
  );
}

export function getNotAllowedEmailAddress(email: string) {
  return i18n.translate('xpack.triggersActionsUI.components.builtinActionTypes.error.notAllowed', {
    defaultMessage: 'Email address {email} is not allowed.',
    values: { email },
  });
}
