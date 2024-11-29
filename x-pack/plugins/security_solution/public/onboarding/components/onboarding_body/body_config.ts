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
import { rulesCardConfig } from './cards/rules';
import { alertsCardConfig } from './cards/alerts';
import { assistantCardConfig } from './cards/assistant';
import { aiConnectorCardConfig } from './cards/siem_migrations/ai_connector';

export const defaultBodyConfig: OnboardingGroupConfig[] = [
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
    cards: [rulesCardConfig, alertsCardConfig],
  },
  {
    title: i18n.translate('xpack.securitySolution.onboarding.discoverGroup.title', {
      defaultMessage: 'Discover Elastic AI',
    }),
    // TODO: Add attackDiscoveryCardConfig when it is ready (https://github.com/elastic/kibana/issues/189487)
    cards: [assistantCardConfig],
  },
];

export const siemMigrationsBodyConfig: OnboardingGroupConfig[] = [
  {
    title: i18n.translate('xpack.securitySolution.onboarding.configure.title', {
      defaultMessage: 'Configure',
    }),
    cards: [aiConnectorCardConfig],
  },
];
