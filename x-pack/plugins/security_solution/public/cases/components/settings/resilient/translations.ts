/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const INCIDENT_TYPES_API_ERROR = i18n.translate(
  'xpack.securitySolution.case.settings.resilient.unableToGetIncidentTypesMessage',
  {
    defaultMessage: 'Unable to get incident types',
  }
);

export const SEVERITY_API_ERROR = i18n.translate(
  'xpack.securitySolution.case.settings.resilient.unableToGetSeverityMessage',
  {
    defaultMessage: 'Unable to get severity',
  }
);
