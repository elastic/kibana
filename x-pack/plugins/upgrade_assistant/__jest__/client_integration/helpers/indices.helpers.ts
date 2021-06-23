/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { EsDeprecationsContent } from '../../../public/application/components/es_deprecations';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/es_deprecations/indices'],
    componentRoutePath: '/es_deprecations/:tabName',
  },
  doMountAsync: true,
};

export type IndicesTestBed = TestBed<IndicesTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */
  const clickTab = (tabName: string) => {
    const { find } = testBed;
    const camelcaseTabName = tabName.charAt(0).toUpperCase() + tabName.slice(1);

    find(`upgradeAssistant${camelcaseTabName}Tab`).simulate('click');
  };

  const clickFixButton = () => {
    const { find } = testBed;
    find('removeIndexSettingsButton').simulate('click');
  };

  const clickExpandAll = () => {
    const { find } = testBed;
    find('expandAll').simulate('click');
  };

  return {
    clickTab,
    clickFixButton,
    clickExpandAll,
  };
};

export const setup = async (overrides?: Record<string, unknown>): Promise<IndicesTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(EsDeprecationsContent, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type IndicesTestSubjects =
  | 'expandAll'
  | 'removeIndexSettingsButton'
  | 'deprecationsContainer'
  | 'permissionsError'
  | 'requestError'
  | 'indexCount'
  | 'upgradedCallout'
  | 'partiallyUpgradedWarning'
  | 'noDeprecationsPrompt'
  | string;
