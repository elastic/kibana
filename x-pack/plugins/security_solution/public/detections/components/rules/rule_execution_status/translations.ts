/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusDescription',
  {
    defaultMessage: 'Last response',
  }
);

export const STATUS_AT = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusAtDescription',
  {
    defaultMessage: 'at',
  }
);

export const STATUS_DATE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.statusDateDescription',
  {
    defaultMessage: 'Status date',
  }
);

export const REFRESH = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.refreshButton',
  {
    defaultMessage: 'Refresh',
  }
);

export const ERROR_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.errorCalloutTitle',
  {
    defaultMessage: 'Rule failure at',
  }
);

export const PARTIAL_FAILURE_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleStatus.partialErrorCalloutTitle',
  {
    defaultMessage: 'Warning at',
  }
);
