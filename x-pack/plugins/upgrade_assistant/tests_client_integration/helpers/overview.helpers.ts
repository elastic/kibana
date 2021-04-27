/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { DeprecationsOverview } from '../../public/application/components/overview';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/overview`],
    componentRoutePath: '/overview',
  },
  doMountAsync: true,
};

export type OverviewTestBed = TestBed<OverviewTestSubjects>;

export const setup = async (overrides?: Record<string, unknown>): Promise<OverviewTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(DeprecationsOverview, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return testBed;
};

export type OverviewTestSubjects =
  | 'overviewPageContent'
  | 'esStatsPanel'
  | 'esStatsPanel.totalDeprecations'
  | 'esStatsPanel.criticalDeprecations'
  | 'deprecationLoggingFormRow'
  | 'requestErrorIconTip'
  | 'partiallyUpgradedErrorIconTip'
  | 'upgradedErrorIconTip'
  | 'unauthorizedErrorIconTip'
  | 'upgradedPrompt'
  | 'partiallyUpgradedPrompt'
  | 'upgradeAssistantDeprecationToggle'
  | 'upgradeStatusError';
