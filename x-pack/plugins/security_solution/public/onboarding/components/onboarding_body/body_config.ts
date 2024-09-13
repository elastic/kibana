/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OnboardingGroupConfig } from '../../types';
import { integrationsCardConfig } from './cards/integrations';
import { dashboardsCardConfig } from './cards/dashboards';

export const bodyConfig: OnboardingGroupConfig[] = [
  {
    title: i18n.translate('xpack.securitySolution.onboarding.dataGroup.title', {
      defaultMessage: 'Ingest your data',
    }),
    cards: [integrationsCardConfig, dashboardsCardConfig],
  },
  {
    title: i18n.translate('xpack.securitySolution.onboarding.alertsGroup.title', {
      defaultMessage: 'Configure rules and alerts',
    }),
    cards: [],
  },
];
