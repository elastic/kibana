/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const API_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.resilient.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const ORG_ID_LABEL = i18n.translate('xpack.stackConnectors.components.resilient.orgId', {
  defaultMessage: 'Organization ID',
});

export const API_KEY_ID_LABEL = i18n.translate(
  'xpack.stackConnectors.components.resilient.apiKeyId',
  {
    defaultMessage: 'API key ID',
  }
);

export const API_KEY_SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.resilient.apiKeySecret',
  {
    defaultMessage: 'API key secret',
  }
);

export const NAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.resilient.requiredNameTextField',
  {
    defaultMessage: 'Name is required.',
  }
);

export const INCIDENT_TYPES_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.resilient.unableToGetIncidentTypesMessage',
  {
    defaultMessage: 'Unable to get incident types',
  }
);

export const SEVERITY_API_ERROR = i18n.translate(
  'xpack.stackConnectors.components.resilient.unableToGetSeverityMessage',
  {
    defaultMessage: 'Unable to get severity',
  }
);
