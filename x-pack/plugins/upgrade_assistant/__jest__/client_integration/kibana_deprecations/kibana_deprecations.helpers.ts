/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, TestBedConfig } from '@kbn/test/jest';
import { KibanaDeprecations } from '../../../public/application/components';
import { WithAppDependencies } from '../helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: ['/kibana_deprecations'],
    componentRoutePath: '/kibana_deprecations',
  },
  doMountAsync: true,
};

export type KibanaTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { component, find } = testBed;

  /**
   * User Actions
   */
  const table = {
    clickRefreshButton: async () => {
      await act(async () => {
        find('refreshButton').simulate('click');
      });

      component.update();
    },
  };

  return {
    table,
  };
};

export const setupKibanaPage = async (
  overrides?: Record<string, unknown>
): Promise<KibanaTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(KibanaDeprecations, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
