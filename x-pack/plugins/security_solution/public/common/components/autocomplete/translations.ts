/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const LOADING = i18n.translate('xpack.securitySolution.autocomplete.loadingDescription', {
  defaultMessage: 'Loading...',
});

export const SELECT_FIELD_FIRST = i18n.translate(
  'xpack.securitySolution.autocomplete.selectField',
  {
    defaultMessage: 'Please select a field first...',
  }
);

export const FIELD_REQUIRED_ERR = i18n.translate(
  'xpack.securitySolution.autocomplete.fieldRequiredError',
  {
    defaultMessage: 'Value cannot be empty',
  }
);

export const NUMBER_ERR = i18n.translate('xpack.securitySolution.autocomplete.invalidNumberError', {
  defaultMessage: 'Not a valid number',
});

export const DATE_ERR = i18n.translate('xpack.securitySolution.autocomplete.invalidDateError', {
  defaultMessage: 'Not a valid date',
});

export const TIMESTAMP_OVERRIDE_ERROR = (field: string) =>
  i18n.translate('xpack.securitySolution.autocomplete.invalidDateError', {
    values: { field },
    defaultMessage:
      'Previously selected field of "{field}" does not exist in all selected rule indices. Select new field or hit "Reset" to clear.',
  });
