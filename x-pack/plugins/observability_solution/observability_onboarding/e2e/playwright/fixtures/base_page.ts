/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as base } from '@playwright/test';
import { HeaderBar } from '../pom/components/header_bar.component';
import { OnboardingPage } from '../pom/pages/onboarding.page';
import { SpaceSelector } from '../pom/components/space_selector.component';
import { SideNav } from '../pom/components/side_nav.component';

export const test = base.extend<{
  headerBar: HeaderBar;
  onboardingPage: OnboardingPage;
  spaceSelector: SpaceSelector;
  sideNav: SideNav;
}>({
  headerBar: async ({ page }, use) => {
    await use(new HeaderBar(page));
  },

  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },

  sideNav: async ({ page }, use) => {
    await use(new SideNav(page));
  },

  spaceSelector: async ({ page }, use) => {
    await use(new SpaceSelector(page));
  },
});
