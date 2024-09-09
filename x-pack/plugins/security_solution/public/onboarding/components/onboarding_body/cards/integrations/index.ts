/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingHubCardConfig } from '../../../../types';
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import { OnboardingHubCardId } from '../../../../constants';

export const integrationsCardConfig: OnboardingHubCardConfig = {
  id: OnboardingHubCardId.integrations,
  title: 'Add data with integrations', // TODO: i18n
  icon: 'fleetApp',
  component: React.lazy(
    () => import('./integrations_card' /* webpackChunkName: "onboarding_integrations_card" */)
  ),
  checkComplete: checkIntegrationsCardComplete,
  capabilities: ['fleet.all', 'fleetv2.all'],
  licenseType: 'basic',
};
