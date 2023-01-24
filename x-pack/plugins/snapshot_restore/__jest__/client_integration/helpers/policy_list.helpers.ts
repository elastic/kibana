/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import {
  registerTestBed,
  AsyncTestBedConfig,
  TestBed,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { PolicyList } from '../../../public/application/sections/home/policy_list';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: ['/policies'],
    componentRoutePath: '/policies/:policyName?',
  },
  doMountAsync: true,
};

const createActions = (testBed: TestBed) => {
  const clickPolicyAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('policyTable');
    const repositoryLink = findTestSubject(rows[index].reactWrapper, 'policyLink');

    await act(async () => {
      const { href } = repositoryLink.props();
      router.navigateTo(href!);
    });

    component.update();
  };

  return {
    clickPolicyAt,
  };
};

export type PoliciesListTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

export const setupPoliciesListPage = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed(WithAppDependencies(PolicyList, httpSetup), testBedConfig);

  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
