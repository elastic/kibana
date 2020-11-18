/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EQL_VALIDATION_REQUEST_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.requestError',
  {
    defaultMessage: 'An error occurred while validating your EQL query',
  }
);

export const EQL_VALIDATION_ERRORS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.title',
  {
    defaultMessage: 'EQL Validation Errors',
  }
);

export const EQL_VALIDATION_ERROR_POPOVER_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlValidation.showErrorsLabel',
  {
    defaultMessage: 'Show EQL Validation Errors',
  }
);

export const EQL_QUERY_BAR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlQueryBar.label',
  {
    defaultMessage: 'Enter an EQL Query',
  }
);

export const EQL_OVERVIEW_LINK_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.eqlOverViewLink.text',
  {
    defaultMessage: 'Event Query Language (EQL) Overview',
  }
);
