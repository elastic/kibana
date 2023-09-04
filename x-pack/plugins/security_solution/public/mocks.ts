/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { UpsellingService } from '@kbn/security-solution-upselling/service';
import type { BreadcrumbsNav } from './common/breadcrumbs';
import type { NavigationLink } from './common/links/types';
import type { PluginStart, PluginSetup } from './types';

const setupMock = (): PluginSetup => ({
  resolver: jest.fn(),
  setAppLinksSwitcher: jest.fn(),
});

const upselling = new UpsellingService();

const startMock = (): PluginStart => ({
  getNavLinks$: jest.fn(() => new BehaviorSubject<NavigationLink[]>([])),
  setIsSidebarEnabled: jest.fn(),
  setGetStartedPage: jest.fn(),
  setIsILMAvailable: jest.fn(),
  getBreadcrumbsNav$: jest.fn(
    () => new BehaviorSubject<BreadcrumbsNav>({ leading: [], trailing: [] })
  ),
  setExtraRoutes: jest.fn(),
  getUpselling: () => upselling,
  setDashboardsLandingCallout: jest.fn(),
});

export const securitySolutionMock = {
  createSetup: setupMock,
  createStart: startMock,
};
