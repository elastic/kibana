/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, findTestSubject, TestBed, TestBedConfig, nextTick } from '@kbn/test/jest';
import { WatchList } from '../../public/application/sections/watch_list/components/watch_list';
import { ROUTES, REFRESH_INTERVALS } from '../../common/constants';
import { withAppContext } from './app_context.mock';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${ROUTES.API_ROOT}/watches`],
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(withAppContext(WatchList), testBedConfig);

export interface WatchListTestBed extends TestBed<WatchListTestSubjects> {
  actions: {
    selectWatchAt: (index: number) => void;
    clickWatchAt: (index: number) => void;
    clickWatchActionAt: (index: number, action: 'delete' | 'edit') => void;
    searchWatches: (term: string) => void;
    advanceTimeToTableRefresh: () => Promise<void>;
  };
}

export const setup = async (): Promise<WatchListTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectWatchAt = (index: number) => {
    const { rows } = testBed.table.getMetaData('watchesTable');
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickWatchAt = async (index: number) => {
    const { rows } = testBed.table.getMetaData('watchesTable');
    const watchesLink = findTestSubject(rows[index].reactWrapper, 'watchesLink');

    await act(async () => {
      const { href } = watchesLink.props();
      testBed.router.navigateTo(href!);
      await nextTick();
      testBed.component.update();
    });
  };

  const clickWatchActionAt = async (index: number, action: 'delete' | 'edit') => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('watchesTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, `${action}WatchButton`);

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const searchWatches = (term: string) => {
    const { find, component } = testBed;
    const searchInput = find('watchesTableContainer').find('.euiFieldSearch');

    // Enter input into the search box
    // @ts-ignore
    searchInput.instance().value = term;
    searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });

    component.update();
  };

  const advanceTimeToTableRefresh = async () => {
    const { component } = testBed;
    await act(async () => {
      // Advance timers to simulate another request
      jest.advanceTimersByTime(REFRESH_INTERVALS.WATCH_LIST);
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      selectWatchAt,
      clickWatchAt,
      clickWatchActionAt,
      searchWatches,
      advanceTimeToTableRefresh,
    },
  };
};

type WatchListTestSubjects = TestSubjects;

export type TestSubjects =
  | 'appTitle'
  | 'documentationLink'
  | 'watchesTable'
  | 'cell'
  | 'row'
  | 'deleteWatchButton'
  | 'createWatchButton'
  | 'emptyPrompt'
  | 'emptyPrompt.createWatchButton'
  | 'editWatchButton'
  | 'watchesTableContainer';
