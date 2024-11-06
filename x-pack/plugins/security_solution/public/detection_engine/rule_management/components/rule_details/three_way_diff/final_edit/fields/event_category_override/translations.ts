/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EQL_OPTIONS_EVENT_CATEGORY_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.ruleManagement.eqlOptionsEventCategoryField.label',
  {
    defaultMessage: 'Event category field',
  }
);

export const EQL_OPTIONS_EVENT_CATEGORY_FIELD_HELPER = i18n.translate(
  'xpack.securitySolution.ruleManagement.eqlOptionsEventCategoryField.text',
  {
    defaultMessage:
      'Field containing the event classification, such as process, file, or network. This field is typically mapped as a field type in the keyword family',
  }
);
