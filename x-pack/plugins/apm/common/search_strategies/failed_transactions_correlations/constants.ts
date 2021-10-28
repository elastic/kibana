/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FAILED_TRANSACTIONS_IMPACT_THRESHOLD = {
  HIGH: i18n.translate(
    'xpack.apm.correlations.failedTransactions.highImpactText',
    {
      defaultMessage: 'High',
    }
  ),
  MEDIUM: i18n.translate(
    'xpack.apm.correlations.failedTransactions.mediumImpactText',
    {
      defaultMessage: 'Medium',
    }
  ),
  LOW: i18n.translate(
    'xpack.apm.correlations.failedTransactions.lowImpactText',
    {
      defaultMessage: 'Low',
    }
  ),
} as const;
