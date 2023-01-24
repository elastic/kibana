/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TYPE_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.eventTypeIndicator.messageText',
  {
    defaultMessage: 'Message',
  }
);

export const TYPE_STATUS_CHANGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.eventTypeIndicator.statusChangeText',
  {
    defaultMessage: 'Status',
  }
);

export const TYPE_EXECUTION_METRICS = i18n.translate(
  'xpack.securitySolution.detectionEngine.ruleMonitoring.eventTypeIndicator.executionMetricsText',
  {
    defaultMessage: 'Metrics',
  }
);
