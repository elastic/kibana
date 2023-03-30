/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const GROUP_BY_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.groupBy.placeholderText',
  {
    defaultMessage: 'Select a field',
  }
);

export const GROUP_BY_FIELD_LICENSE_WARNING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.groupBy.licenseWarning',
  {
    defaultMessage: 'Alert suppression is enabled with Platinum license or above',
  }
);
