/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.passwordFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const FROM_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.fromTextFieldLabel',
  {
    defaultMessage: 'Sender',
  }
);

export const SERVICE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.serviceTextFieldLabel',
  {
    defaultMessage: 'Service',
  }
);

export const TENANT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.tenantIdFieldLabel',
  {
    defaultMessage: 'Tenant ID',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.clientIdFieldLabel',
  {
    defaultMessage: 'Client ID',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Client Secret',
  }
);

export const HOST_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.hostTextFieldLabel',
  {
    defaultMessage: 'Host',
  }
);

export const PORT_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.portTextFieldLabel',
  {
    defaultMessage: 'Port',
  }
);

export const SECURE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.secureSwitchLabel',
  {
    defaultMessage: 'Secure',
  }
);

export const HAS_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.email.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this server',
  }
);

export const SENDER_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredFromText',
  {
    defaultMessage: 'Sender is required.',
  }
);

export const CLIENT_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredClientIdText',
  {
    defaultMessage: 'Client ID is required.',
  }
);

export const TENANT_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredTenantIdText',
  {
    defaultMessage: 'Tenant ID is required.',
  }
);

export const PORT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredPortText',
  {
    defaultMessage: 'Port is required.',
  }
);

export const PORT_INVALID = i18n.translate(
  'xpack.stackConnectors.components.email.error.invalidPortText',
  {
    defaultMessage: 'Port is invalid.',
  }
);

export const SERVICE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredServiceText',
  {
    defaultMessage: 'Service is required.',
  }
);

export const HOST_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredHostText',
  {
    defaultMessage: 'Host is required.',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const TO_CC_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredEntryText',
  {
    defaultMessage: 'No To, Cc, or Bcc entry.  At least one entry is required.',
  }
);

export const MESSAGE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredMessageText',
  {
    defaultMessage: 'Message is required.',
  }
);

export const SUBJECT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredSubjectText',
  {
    defaultMessage: 'Subject is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.error.requiredPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const CLIENT_SECRET_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.email.requiredClientSecretText',
  {
    defaultMessage: 'Client Secret is required.',
  }
);

export function getInvalidEmailAddress(email: string) {
  return i18n.translate('xpack.stackConnectors.components.email.error.invalidEmail', {
    defaultMessage: 'Email address {email} is not valid.',
    values: { email },
  });
}

export function getNotAllowedEmailAddress(email: string) {
  return i18n.translate('xpack.stackConnectors.components.email.error.notAllowed', {
    defaultMessage: 'Email address {email} is not allowed.',
    values: { email },
  });
}
