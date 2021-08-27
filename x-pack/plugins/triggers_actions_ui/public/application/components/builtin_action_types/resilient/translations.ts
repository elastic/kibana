/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required.',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const API_URL_REQUIRE_HTTPS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requireHttpsApiUrlTextField',
  {
    defaultMessage: 'URL must start with https://.',
  }
);

export const ORG_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.orgId',
  {
    defaultMessage: 'Organization ID',
  }
);

export const ORG_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredOrgIdTextField',
  {
    defaultMessage: 'Organization ID is required',
  }
);

export const API_KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKey',
  {
    defaultMessage: 'API key',
  }
);

export const REMEMBER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.rememberValuesLabel',
  {
    defaultMessage:
      'Remember these values. You must reenter them each time you edit the connector.',
  }
);

export const REENTER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.reenterValuesLabel',
  {
    defaultMessage: 'ID and secret are encrypted. Please reenter values for these fields.',
  }
);

export const API_KEY_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeyId',
  {
    defaultMessage: 'ID',
  }
);

export const API_KEY_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeyIdTextField',
  {
    defaultMessage: 'ID is required',
  }
);

export const API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeySecret',
  {
    defaultMessage: 'Secret',
  }
);

export const API_KEY_SECRET_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeySecretTextField',
  {
    defaultMessage: 'Secret is required',
  }
);

export const MAPPING_FIELD_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.mappingFieldShortDescription',
  {
    defaultMessage: 'Name',
  }
);

export const MAPPING_FIELD_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.mappingFieldDescription',
  {
    defaultMessage: 'Description',
  }
);

export const MAPPING_FIELD_COMMENTS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.mappingFieldComments',
  {
    defaultMessage: 'Comments',
  }
);

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredDescriptionTextField',
  {
    defaultMessage: 'Description is required.',
  }
);

export const NAME_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredNameTextField',
  {
    defaultMessage: 'Name is required.',
  }
);

export const INCIDENT_TYPES_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.unableToGetIncidentTypesMessage',
  {
    defaultMessage: 'Unable to get incident types',
  }
);

export const SEVERITY_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.unableToGetSeverityMessage',
  {
    defaultMessage: 'Unable to get severity',
  }
);
