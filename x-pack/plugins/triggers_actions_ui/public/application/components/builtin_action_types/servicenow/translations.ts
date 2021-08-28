/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required.',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const API_URL_REQUIRE_HTTPS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requireHttpsApiUrlTextField',
  {
    defaultMessage: 'URL must start with https://.',
  }
);

export const AUTHENTICATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);

export const REMEMBER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.rememberValuesLabel',
  {
    defaultMessage:
      'Remember these values. You must reenter them each time you edit the connector.',
  }
);

export const REENTER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.reenterValuesLabel',
  {
    defaultMessage: 'Username and password are encrypted. Please reenter values for these fields.',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.usernameTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredUsernameTextField',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.requiredPasswordTextField',
  {
    defaultMessage: 'Password is required.',
  }
);

export const TITLE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.common.requiredShortDescTextField',
  {
    defaultMessage: 'Short description is required.',
  }
);

export const SOURCE_IP_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.sourceIPTitle',
  {
    defaultMessage: 'Source IP',
  }
);

export const DEST_IP_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.destinationIPTitle',
  {
    defaultMessage: 'Destination IP',
  }
);

export const INCIDENT = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.title',
  {
    defaultMessage: 'Incident',
  }
);

export const SHORT_DESCRIPTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.titleFieldLabel',
  {
    defaultMessage: 'Short description (required)',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.descriptionTextAreaFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const COMMENTS_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.commentsTextAreaFieldLabel',
  {
    defaultMessage: 'Additional comments',
  }
);

export const MALWARE_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.malwareURLTitle',
  {
    defaultMessage: 'Malware URL',
  }
);

export const MALWARE_HASH_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.malwareHashTitle',
  {
    defaultMessage: 'Malware Hash',
  }
);

export const CHOICES_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.unableToGetChoicesMessage',
  {
    defaultMessage: 'Unable to get choices',
  }
);

export const CATEGORY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.categoryTitle',
  {
    defaultMessage: 'Category',
  }
);

export const SUBCATEGORY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.subcategoryTitle',
  {
    defaultMessage: 'Subcategory',
  }
);

export const URGENCY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.urgencySelectFieldLabel',
  {
    defaultMessage: 'Urgency',
  }
);

export const SEVERITY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectFieldLabel',
  {
    defaultMessage: 'Severity',
  }
);

export const IMPACT_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.impactSelectFieldLabel',
  {
    defaultMessage: 'Impact',
  }
);

export const PRIORITY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.prioritySelectFieldLabel',
  {
    defaultMessage: 'Priority',
  }
);
