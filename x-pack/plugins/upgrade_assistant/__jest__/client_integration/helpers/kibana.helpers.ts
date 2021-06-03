/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { KibanaDeprecationsContent } from '../../../public/application/components/kibana_deprecations';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/kibana_deprecations'],
    componentRoutePath: '/kibana_deprecations',
  },
  doMountAsync: true,
};

export type KibanaTestBed = TestBed<KibanaTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */

  const clickExpandAll = () => {
    const { find } = testBed;
    find('expandAll').simulate('click');
  };

  return {
    clickExpandAll,
  };
};

export const setup = async (overrides?: Record<string, unknown>): Promise<KibanaTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(KibanaDeprecationsContent, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type KibanaTestSubjects =
  | 'expandAll'
  | 'noDeprecationsPrompt'
  | 'kibanaPluginError'
  | 'kibanaDeprecationsContent'
  | 'kibanaDeprecationItem'
  | 'kibanaRequestError'
  | string;
