/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const RESILIENT_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.selectMessageText',
  {
    defaultMessage: 'Push or update SIEM case data to a new issue in resilient',
  }
);

export const RESILIENT_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.actionTypeTitle',
  {
    defaultMessage: 'IBM Resilient',
  }
);

export const RESILIENT_PROJECT_KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.orgId',
  {
    defaultMessage: 'Organization Id',
  }
);

export const RESILIENT_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredOrgIdTextField',
  {
    defaultMessage: 'Organization Id',
  }
);

export const RESILIENT_API_KEY_ID_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeyId',
  {
    defaultMessage: 'API key id',
  }
);

export const RESILIENT_API_KEY_ID_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeyIdTextField',
  {
    defaultMessage: 'API key id is required',
  }
);

export const RESILIENT_API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiKeySecret',
  {
    defaultMessage: 'API key secret',
  }
);

export const RESILIENT_API_KEY_SECRET_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.requiredApiKeySecretTextField',
  {
    defaultMessage: 'API key secret is required',
  }
);

export const MAPPING_FIELD_NAME = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.mappingFieldName',
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

export const TITLE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.common.requiredTitleTextField',
  {
    defaultMessage: 'Title is required.',
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

export const API_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);
