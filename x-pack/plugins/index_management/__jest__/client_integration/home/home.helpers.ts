/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: TestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/indices?includeHidden=true`],
    componentRoutePath: `/:section(indices|templates)`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(IndexManagementHome), testBedConfig);

export interface HomeTestBed extends TestBed<TestSubjects> {
  actions: {
    selectHomeTab: (tab: 'indicesTab' | 'templatesTab') => void;
  };
}

export const setup = async (): Promise<HomeTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectHomeTab = (tab: 'indicesTab' | 'templatesTab') => {
    testBed.find(tab).simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectHomeTab,
    },
  };
};
