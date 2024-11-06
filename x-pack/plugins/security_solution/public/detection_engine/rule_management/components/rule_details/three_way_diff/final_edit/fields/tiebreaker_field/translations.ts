/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.eqlOptionsEventTiebreakerField.label',
  {
    defaultMessage: 'Tiebreaker field',
  }
);

export const EQL_OPTIONS_EVENT_TIEBREAKER_FIELD_HELPER = i18n.translate(
  'xpack.securitySolution.ruleManagement.eqlOptionsEventTiebreakerField.text',
  {
    defaultMessage:
      'Field used to sort hits with the same timestamp in ascending, lexicographic order',
  }
);
