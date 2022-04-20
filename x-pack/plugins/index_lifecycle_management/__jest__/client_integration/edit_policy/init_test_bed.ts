/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBedConfig } from '@kbn/test-jest-helpers';

import '../helpers/global_mocks';

import { HttpSetup } from '@kbn/core/public';
import { WithAppDependencies } from '../helpers';
import { EditPolicy } from '../../../public/application/sections/edit_policy';
import { AppServicesContext } from '../../../public/types';
import { POLICY_NAME } from './constants';

const getTestBedConfig = (testBedConfig?: Partial<TestBedConfig>): TestBedConfig => {
  return {
    memoryRouter: {
      initialEntries: [`/policies/edit/${POLICY_NAME}`],
      componentRoutePath: `/policies/edit/:policyName`,
    },
    ...testBedConfig,
  };
};

export const initTestBed = async (
  httpSetup: HttpSetup,
  arg?: {
    appServicesContext?: Partial<AppServicesContext>;
    testBedConfig?: Partial<TestBedConfig>;
  }
) => {
  const { testBedConfig, appServicesContext } = arg || {};

  const createTestBed = registerTestBed(
    WithAppDependencies(EditPolicy, httpSetup, appServicesContext),
    getTestBedConfig(testBedConfig)
  );

  return await createTestBed();
};
