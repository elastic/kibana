/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CORRELATIONS_IMPACT_THRESHOLD = {
  HIGH: i18n.translate('xpack.apm.correlations.highImpactText', {
    defaultMessage: 'High',
  }),
  MEDIUM: i18n.translate('xpack.apm.correlations.mediumImpactText', {
    defaultMessage: 'Medium',
  }),
  LOW: i18n.translate('xpack.apm.correlations.lowImpactText', {
    defaultMessage: 'Low',
  }),
  VERY_LOW: i18n.translate('xpack.apm.correlations.veryLowImpactText', {
    defaultMessage: 'Very low',
  }),
} as const;
