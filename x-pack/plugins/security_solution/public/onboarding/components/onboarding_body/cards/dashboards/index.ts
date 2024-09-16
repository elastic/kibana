/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { DASHBOARDS_CARD_TITLE } from './translations';

export const dashboardsCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.dashboards,
  title: DASHBOARDS_CARD_TITLE,
  icon: 'dashboardApp',
  Component: React.lazy(
    () => import('./dashboards_card' /* webpackChunkName: "onboarding_dashboards_card" */)
  ),
  capabilities: ['dashboard.show'],
};
