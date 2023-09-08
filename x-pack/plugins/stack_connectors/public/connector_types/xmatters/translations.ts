/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASIC_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.connectorSettingsLabel',
  {
    defaultMessage: 'Select the authentication method used when setting up the xMatters trigger.',
  }
);

export const BASIC_AUTH_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.xmatters.error.requiredConnectorSettingsText',
  {
    defaultMessage: 'Authentication method is required.',
  }
);

export const BASIC_AUTH_BUTTON_GROUP_LEGEND = i18n.translate(
  'xpack.stackConnectors.components.xmatters.basicAuthButtonGroupLegend',
  {
    defaultMessage: 'Basic Authentication',
  }
);

export const URL_LABEL = i18n.translate('xpack.stackConnectors.components.xmatters.urlLabel', {
  defaultMessage: 'Initiation URL',
});

export const USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.xmatters.error.requiredPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const BASIC_AUTH_BUTTON_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.basicAuthLabel',
  {
    defaultMessage: 'Basic Authentication',
  }
);

export const URL_AUTH_BUTTON_LABEL = i18n.translate(
  'xpack.stackConnectors.components.xmatters.urlAuthLabel',
  {
    defaultMessage: 'URL Authentication',
  }
);

export const URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.xmatters.error.requiredUrlText',
  {
    defaultMessage: 'URL is required.',
  }
);

export const URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.xmatters.error.invalidUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const USERNAME_INVALID = i18n.translate(
  'xpack.stackConnectors.components.xmatters.error.invalidUsernameTextField',
  {
    defaultMessage: 'Username is invalid.',
  }
);
