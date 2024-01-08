/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_TYPES_API_ERROR = i18n.translate(
  'xpack.cases.connectors.resilient.unableToGetIncidentTypesMessage',
  {
    defaultMessage: 'Unable to get incident types',
  }
);

export const SEVERITY_API_ERROR = i18n.translate(
  'xpack.cases.connectors.resilient.unableToGetSeverityMessage',
  {
    defaultMessage: 'Unable to get severity',
  }
);

export const INCIDENT_TYPES_PLACEHOLDER = i18n.translate(
  'xpack.cases.connectors.resilient.incidentTypesPlaceholder',
  {
    defaultMessage: 'Choose types',
  }
);

export const INCIDENT_TYPES_LABEL = i18n.translate(
  'xpack.cases.connectors.resilient.incidentTypesLabel',
  {
    defaultMessage: 'Incident types',
  }
);

export const SEVERITY_LABEL = i18n.translate('xpack.cases.connectors.resilient.severityLabel', {
  defaultMessage: 'Severity',
});
