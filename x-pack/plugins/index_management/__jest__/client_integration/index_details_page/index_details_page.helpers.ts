/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncTestBedConfig, registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import {
  IndexDetailsPage,
  IndexDetailsSection,
} from '../../../public/application/sections/home/index_list/details_page';
import { WithAppDependencies } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/indices/test_index`],
    componentRoutePath: `/indices/:indexName/:indexDetailsSection?`,
  },
  doMountAsync: true,
};

export interface IndexDetailsPageTestBed extends TestBed {
  actions: {
    getHeader: () => string;
    clickIndexDetailsTab: (tab: IndexDetailsSection) => Promise<void>;
    getActiveTabContent: () => string;
  };
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<IndexDetailsPageTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexDetailsPage, httpSetup, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  const getHeader = () => {
    return testBed.component.find('[data-test-subj="indexDetailsHeader"] h1').text();
  };

  const clickIndexDetailsTab = async (tab: IndexDetailsSection) => {
    const { find, component } = testBed;

    await act(async () => {
      find(`indexDetailsTab-${tab}`).simulate('click');
    });
    component.update();
  };

  const getActiveTabContent = () => {
    return testBed.find('indexDetailsContent').text();
  };

  return {
    ...testBed,
    actions: {
      getHeader,
      clickIndexDetailsTab,
      getActiveTabContent,
    },
  };
};
