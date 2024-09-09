/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { integrationsCardConfig } from './cards/integrations';
import type { OnboardingHubGroupConfig } from '../../types';

export const cardGroupsConfig: OnboardingHubGroupConfig[] = [
  {
    title: 'Add and validate your data', // TODO: i18n
    cards: [
      integrationsCardConfig,
      // dashboardsCardConfig,
    ],
  },
  // ...
];
