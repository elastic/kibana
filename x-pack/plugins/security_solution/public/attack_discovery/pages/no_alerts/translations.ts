/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVERY_ONLY = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.noAlerts.attackDiscoveryOnlyLabel',
  {
    defaultMessage: 'Attack Discovery only analyzes alerts from the past 24 hours.',
  }
);

export const LEARN_MORE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.noAlerts.learnMoreLink',
  {
    defaultMessage: 'Learn more about Attack discovery',
  }
);

export const NO_ALERTS_TO_ANALYZE = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.noAlerts.noAlertsToAnalyzeTitle',
  {
    defaultMessage: 'No alerts to analyze',
  }
);
