/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AddIntegrationsSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from '@kbn/security-solution-plugin/public';
import type { Services } from '../common/services';

export const setOnboardingSettings = (services: Services) => {
  const {
    securitySolution,
    application: { getUrlForApp },
  } = services;

  securitySolution.setOnboardingPageSettings.setUsersUrl(
    getUrlForApp('management', { path: 'security/users' })
  );

  securitySolution.setOnboardingPageSettings.setAvailableSteps([
    OverviewSteps.getToKnowElasticSecurity,
    AddIntegrationsSteps.connectToDataSources,
    ViewDashboardSteps.analyzeData,
    EnablePrebuiltRulesSteps.enablePrebuiltRules,
    ViewAlertsSteps.viewAlerts,
  ]);
};
