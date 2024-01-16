/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  AddIntegrationsSteps,
  CreateProjectSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from '../../types';

export const GetStartedContextProvider = ({ children }: { children: React.ReactElement }) => (
  <>{children}</>
);

export const useGetStartedContext = jest.fn(() => ({
  productTypes: [
    { product_line: 'security', product_tier: 'essentials' },
    { product_line: 'endpoint', product_tier: 'complete' },
    { product_line: 'cloud', product_tier: 'complete' },
  ],
  projectsUrl: 'mockProjectsUrl',
  projectFeaturesUrl: 'mockProjectFeaturesUrl',
  availableSteps: [
    CreateProjectSteps.createFirstProject,
    OverviewSteps.getToKnowElasticSecurity,
    AddIntegrationsSteps.connectToDataSources,
    ViewDashboardSteps.analyzeData,
    EnablePrebuiltRulesSteps.enablePrebuiltRules,
    ViewAlertsSteps.viewAlerts,
  ],
}));
