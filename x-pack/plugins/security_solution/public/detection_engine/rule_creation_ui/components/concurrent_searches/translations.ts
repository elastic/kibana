/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GREATER_THAN_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.concurrentSearchesItemsPerSearchFieldGreaterThanError',
  {
    defaultMessage: 'Value must be greater than 0.',
  }
);

export const LESS_THAN_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.concurrentSearchesItemsPerSearchFieldLessThanError',
  {
    defaultMessage: "The multiplied value can't be more than 10,000.",
  }
);
