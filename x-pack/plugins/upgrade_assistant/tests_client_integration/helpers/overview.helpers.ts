/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { PageContent } from '../../public/application/components/page_content';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  doMountAsync: true,
};

export type OverviewTestBed = TestBed<OverviewTestSubjects>;

export const setup = async (overrides?: any): Promise<OverviewTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(PageContent, overrides), testBedConfig);
  const testBed = await initTestBed();

  return testBed;
};

export type OverviewTestSubjects =
  | 'comingSoonPrompt'
  | 'upgradeAssistantPageContent'
  | 'upgradedPrompt'
  | 'partiallyUpgradedPrompt'
  | 'upgradeAssistantDeprecationToggle'
  | 'deprecationLoggingStep'
  | 'upgradeStatusError';
