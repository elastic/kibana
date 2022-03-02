/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STACK_BY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.stackByLabel',
  {
    defaultMessage: 'Stack by',
  }
);

export const STACK_BY_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.stackByPlaceholder',
  {
    defaultMessage: 'Select a field to stack by',
  }
);

export const STACK_BY_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.histogram.stackByOptions.stackByAriaLabel',
  {
    defaultMessage: 'Stack the alerts histogram by a field value',
  }
);
