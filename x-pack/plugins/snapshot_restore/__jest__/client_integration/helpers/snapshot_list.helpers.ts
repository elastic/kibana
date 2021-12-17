/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { AsyncTestBedConfig, registerTestBed, TestBed } from '@kbn/test/jest';

import { BASE_PATH } from '../../../public/application/constants';
import { SnapshotList } from '../../../public/application/sections/home/snapshot_list';
import { WithAppDependencies } from './setup_environment';

const getTestBedConfig = (query?: string): AsyncTestBedConfig => ({
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/snapshots${query ?? ''}`],
    componentRoutePath: `${BASE_PATH}/snapshots/:repositoryName?/:snapshotId*`,
  },
  doMountAsync: true,
});

const initTestBed = (query?: string) =>
  registerTestBed(WithAppDependencies(SnapshotList), getTestBedConfig(query))();

export interface SnapshotListTestBed extends TestBed {
  actions: {
    clickReloadButton: () => void;
    setSearchText: (value: string, advanceTime?: boolean) => void;
  };
}

const searchBarSelector = 'snapshotListSearch';
export const setup = async (query?: string): Promise<SnapshotListTestBed> => {
  const testBed = await initTestBed(query);
  const { find, form, component } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  const setSearchText = async (value: string, advanceTime = true) => {
    await act(async () => {
      form.setInputValue(searchBarSelector, value);
      if (advanceTime) {
        jest.advanceTimersByTime(500);
      }
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      clickReloadButton,
      setSearchText,
    },
  };
};
