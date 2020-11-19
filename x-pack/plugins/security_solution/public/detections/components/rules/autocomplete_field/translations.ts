/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const RESET = i18n.translate('xpack.securitySolution.autocomplete.resetLabel', {
  defaultMessage: 'Reset',
});

export const TIMESTAMP_OVERRIDE_ERROR = (field: string) =>
  i18n.translate('xpack.securitySolution.autocomplete.invalidDateError', {
    values: { field },
    defaultMessage:
      'Previously selected field of "{field}" does not exist in all selected rule indices. Select new field or hit "Reset" to clear.',
  });
