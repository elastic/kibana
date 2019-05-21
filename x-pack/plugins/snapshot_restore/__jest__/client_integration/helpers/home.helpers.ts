/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, findTestSubject, TestBed } from '../../../../../test_utils';
import { SnapshotRestoreHome } from '../../../public/app/sections/home/home';
import { BASE_PATH } from '../../../public/app/constants';
import { WithProviders } from './providers';

const testBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/repositories`],
    componentRoutePath: `${BASE_PATH}/:section(repositories|snapshots)/:repositoryName?/:snapshotId*`,
  },
};

const initTestBed = registerTestBed(WithProviders(SnapshotRestoreHome), testBedConfig);

export interface HomeTestBed extends TestBed<TestSubjects> {
  actions: {
    selectRepositoryAt: (index: number) => void;
    clickRepositoryAt: (index: number) => void;
  };
}

export const setup = async (): Promise<HomeTestBed> => {
  const testBed = await initTestBed();
  const TABLE = 'repositoryTable';

  /**
   * User Actions
   */

  const selectRepositoryAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickRepositoryAt = (index = 0) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const repositoryLink = findTestSubject(rows[index].reactWrapper, 'repositoryLink');
    repositoryLink.simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectRepositoryAt,
      clickRepositoryAt,
    },
  };
};

export type TestSubjects =
  | 'appTitle'
  | 'cell'
  | 'checkboxSelectAll'
  | 'checkboxSelectRow-aa'
  | 'emptyPrompt'
  | 'emptyPrompt.registerRepositoryButton'
  | 'repositoryLink'
  | 'repositoryList'
  | 'repositoryTable'
  | 'repositoryDetail'
  | 'repositoryDetail.title'
  | 'row'
  | 'snapshotList'
  | 'sectionLoading'
  | 'documentationLink'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.appTitle'
  | 'snapshotRestoreApp.repositoryList'
  | 'snapshotRestoreApp.repositoryList.repositoryTable'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.checkboxSelectAll'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.cell'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.cell.repositoryLink'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.checkboxSelectRow-aa'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.srRepositoryListDeleteActionButton'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryList.srRepositoriesAddButton'
  | 'snapshotRestoreApp.tab'
  | 'srRepositoriesAddButton'
  | 'srRepositoryListDeleteActionButton'
  | 'tab'
  | 'tableHeaderCell_name_0'
  | 'tableHeaderCell_type_1'
  | 'tableHeaderSortButton';
