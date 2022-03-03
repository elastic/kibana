/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBedConfig, registerTestBed, TestBed } from '@kbn/test-jest-helpers';

import { BASE_PATH } from '../../../public/application/constants';
import { SnapshotList } from '../../../public/application/sections/home/snapshot_list';
import { WithAppDependencies } from './setup_environment';

const getTestBedConfig = (query?: string): TestBedConfig => ({
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/snapshots${query ?? ''}`],
    componentRoutePath: `${BASE_PATH}/snapshots/:repositoryName?/:snapshotId*`,
  },
});

const initTestBed = (query?: string) =>
  registerTestBed(WithAppDependencies(SnapshotList), getTestBedConfig(query))();

export interface SnapshotListTestBed extends TestBed {
  actions: {
    setSearchText: (value: string, advanceTime?: boolean) => void;
    searchErrorExists: () => boolean;
    getSearchErrorText: () => string;
  };
}

const searchBarSelector = 'snapshotListSearch';
const searchErrorSelector = 'snapshotListSearchError';

export const setup = async (query?: string): Promise<SnapshotListTestBed> => {
  const testBed = await initTestBed(query);
  const { form, component, find, exists } = testBed;

  const setSearchText = async (value: string, advanceTime = true) => {
    await act(async () => {
      form.setInputValue(searchBarSelector, value);
    });
    component.update();
    if (advanceTime) {
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      component.update();
    }
  };

  const searchErrorExists = (): boolean => {
    return exists(searchErrorSelector);
  };

  const getSearchErrorText = (): string => {
    return find(searchErrorSelector).text();
  };

  return {
    ...testBed,
    actions: {
      setSearchText,
      searchErrorExists,
      getSearchErrorText,
    },
  };
};
