/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/enrich_policies`],
    componentRoutePath: `/:section(enrich_policies)`,
  },
  doMountAsync: true,
};

export interface EnrichPoliciesTestBed extends TestBed<TestSubjects> {
  actions: {
    goToEnrichPoliciesTab: () => void;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<EnrichPoliciesTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  /**
   * User Actions
   */
  const goToEnrichPoliciesTab = () => {
    testBed.find('enrich_policiesTab').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      goToEnrichPoliciesTab,
    },
  };
};
