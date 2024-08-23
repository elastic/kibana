/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_IS_CURRENTLY_ANALYZING = (alertsCount: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.pages.loadingCallout.aiIsCurrentlyAnalyzing',
    {
      defaultMessage: `AI is analyzing up to {alertsCount} {alertsCount, plural, =1 {alert} other {alerts}} in the last 24 hours to generate discoveries.`,
      values: { alertsCount },
    }
  );

export const ATTACK_DISCOVERY_GENERATION_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.attackDiscovery.pages.loadingCallout.attackDiscoveryGenerationInProgressLabel',
  {
    defaultMessage: 'Attack discovery in progress',
  }
);
