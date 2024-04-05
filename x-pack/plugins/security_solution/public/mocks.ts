/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, of } from 'rxjs';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { BreadcrumbsNav } from './common/breadcrumbs';
import type { NavigationLink } from './common/links/types';
import { allowedExperimentalValues } from '../common/experimental_features';
import type { PluginStart, PluginSetup, ContractStartServices } from './types';
import { OnboardingPageService } from './app/components/onboarding/onboarding_page_service';

const upselling = new UpsellingService();
const onboardingPageService = new OnboardingPageService();

export const contractStartServicesMock: ContractStartServices = {
  getComponents$: jest.fn(() => of({})),
  upselling,
  onboarding: onboardingPageService,
};

const setupMock = (): PluginSetup => ({
  resolver: jest.fn(),
  experimentalFeatures: allowedExperimentalValues, // default values
});

const startMock = (): PluginStart => ({
  getNavLinks$: jest.fn(() => new BehaviorSubject<NavigationLink[]>([])),
  setComponents: jest.fn(),
  getBreadcrumbsNav$: jest.fn(
    () => new BehaviorSubject<BreadcrumbsNav>({ leading: [], trailing: [] })
  ),
  getUpselling: () => upselling,
  setOnboardingPageSettings: onboardingPageService,
  setIsSolutionNavigationEnabled: jest.fn(),
  getSolutionNavigation: jest.fn(() => ({
    navigationTree$: of({ body: [], footer: [] }),
    panelContentProvider: jest.fn(),
  })),
});

export const securitySolutionMock = {
  createSetup: setupMock,
  createStart: startMock,
};
