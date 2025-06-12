/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PageObjects, ScoutPage, createLazyPageObject } from '@kbn/scout';
import { OnboardingHomePage } from './onboarding_home';
import { CustomLogsPage } from './custom_logs';

export interface ObltPageObjects extends PageObjects {
  onboardingHome: OnboardingHomePage;
  customLogs: CustomLogsPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): ObltPageObjects {
  return {
    ...pageObjects,
    onboardingHome: createLazyPageObject(OnboardingHomePage, page),
    customLogs: createLazyPageObject(CustomLogsPage, page),
  };
}
