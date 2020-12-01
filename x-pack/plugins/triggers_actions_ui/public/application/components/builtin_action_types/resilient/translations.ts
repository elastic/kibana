/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.selectMessageText',
  {
    defaultMessage: 'Push or update data to a new incident in Resilient.',
  }
);

export const TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.actionTypeTitle',
  {
    defaultMessage: 'Resilient',
  }
);

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

export const API_KEY_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeyId',
  {
    defaultMessage: 'API key ID',
  }
);

export const API_KEY_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeyIdTextField',
  {
    defaultMessage: 'API key ID is required',
  }
);

export const API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeySecret',
  {
    defaultMessage: 'API key secret',
  }
);

export const API_KEY_SECRET_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeySecretTextField',
  {
    defaultMessage: 'API key secret is required',
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
