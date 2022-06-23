/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  findTestSubject,
  TestBed,
  AsyncTestBedConfig,
  delay,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { SnapshotRestoreHome } from '../../../public/application/sections/home/home';
import { BASE_PATH } from '../../../public/application/constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/repositories`],
    componentRoutePath: `${BASE_PATH}/:section(repositories|snapshots)/:repositoryName?/:snapshotId*`,
  },
  doMountAsync: true,
};

export interface HomeTestBed extends TestBed {
  actions: {
    clickReloadButton: () => void;
    selectRepositoryAt: (index: number) => void;
    clickRepositoryAt: (index: number) => void;
    clickSnapshotAt: (index: number) => void;
    clickRepositoryActionAt: (index: number, action: 'delete' | 'edit') => void;
    selectTab: (tab: 'snapshots' | 'repositories') => void;
    selectSnapshotDetailTab: (tab: 'summary' | 'failedIndices') => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<HomeTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(SnapshotRestoreHome, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();
  const REPOSITORY_TABLE = 'repositoryTable';
  const SNAPSHOT_TABLE = 'snapshotTable';
  const { find, table, router, component } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  const selectRepositoryAt = (index: number) => {
    const { rows } = table.getMetaData(REPOSITORY_TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickRepositoryAt = async (index: number) => {
    const { rows } = table.getMetaData(REPOSITORY_TABLE);
    const repositoryLink = findTestSubject(rows[index].reactWrapper, 'repositoryLink');

    await act(async () => {
      const { href } = repositoryLink.props();
      router.navigateTo(href!);
      await delay(10);
      component.update();
    });
  };

  const clickRepositoryActionAt = async (index: number, action: 'delete' | 'edit') => {
    const { rows } = table.getMetaData('repositoryTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, `${action}RepositoryButton`);

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickSnapshotAt = async (index: number) => {
    const { rows } = table.getMetaData(SNAPSHOT_TABLE);
    const snapshotLink = findTestSubject(rows[index].reactWrapper, 'snapshotLink');

    await act(async () => {
      const { href } = snapshotLink.props();
      router.navigateTo(href!);
      await delay(100);
      component.update();
    });
  };

  const selectTab = (tab: 'repositories' | 'snapshots') => {
    const tabs = ['snapshots', 'repositories'];

    testBed.find(`${tab}_tab`).at(tabs.indexOf(tab)).simulate('click');
  };

  const selectSnapshotDetailTab = (tab: 'summary' | 'failedIndices') => {
    const tabs = ['summary', 'failedIndices'];

    testBed.find('snapshotDetail.tab').at(tabs.indexOf(tab)).simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickReloadButton,
      selectRepositoryAt,
      clickRepositoryAt,
      clickRepositoryActionAt,
      clickSnapshotAt,
      selectTab,
      selectSnapshotDetailTab,
    },
  };
};
