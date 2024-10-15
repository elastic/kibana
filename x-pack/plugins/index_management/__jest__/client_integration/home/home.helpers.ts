/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';
import { HttpSetup } from 'src/core/public';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/indices?includeHidden=true`],
    componentRoutePath: `/:section(indices|templates)`,
  },
  doMountAsync: true,
};

export interface HomeTestBed extends TestBed<TestSubjects> {
  actions: {
    selectHomeTab: (tab: 'indicesTab' | 'templatesTab') => void;
    toggleHiddenIndices: () => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<HomeTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();
  const { find } = testBed;

  /**
   * User Actions
   */

  const selectHomeTab = (tab: 'indicesTab' | 'templatesTab') => {
    find(tab).simulate('click');
  };

  const toggleHiddenIndices = async function () {
    find('indexTableIncludeHiddenIndicesToggle').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectHomeTab,
      toggleHiddenIndices,
    },
  };
};
