/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingHubCardId } from '../../../../constants';

export const dashboardsCardConfig: OnboardingCardConfig = {
  id: OnboardingHubCardId.dashboards,
  title: i18n.translate('xpack.securitySolution.onboarding.dashboardsCard.title', {
    defaultMessage: 'View and analyze your data using dashboards',
  }),
  icon: 'dashboardApp',
  Component: React.lazy(
    () => import('./dashboards_card' /* webpackChunkName: "onboarding_dashboards_card" */)
  ),
  capabilities: ['dashboard.show'],
};
