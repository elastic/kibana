/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, findTestSubject, TestBed, nextTick } from '../../../../../test_utils';
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
    clickRepositoryActionAt: (index: number, action: 'delete' | 'edit') => void;
    selectTab: (tab: 'snapshots' | 'repositories') => void;
  };
}

export const setup = async (): Promise<HomeTestBed> => {
  const testBed = await initTestBed();
  const TABLE = 'repositoryTable';

  /**
   * User Actions
   */

  const selectRepositoryAt = (index: number) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const row = rows[index];
    const checkBox = row.reactWrapper.find('input').hostNodes();
    checkBox.simulate('change', { target: { checked: true } });
  };

  const clickRepositoryAt = async (index: number) => {
    const { rows } = testBed.table.getMetaData(TABLE);
    const repositoryLink = findTestSubject(rows[index].reactWrapper, 'repositoryLink');

    await act(async () => {
      repositoryLink.simulate('click');
      await nextTick();
      testBed.component.update();
    });
  };

  const clickRepositoryActionAt = async (index: number, action: 'delete' | 'edit') => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('repositoryTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, `${action}RepositoryButton`);

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const selectTab = (tab: 'repositories' | 'snapshots') => {
    const tabs = ['snapshots', 'repositories'];

    testBed
      .find('tab')
      .at(tabs.indexOf(tab))
      .simulate('click');
  };

  return {
    ...testBed,
    actions: {
      selectRepositoryAt,
      clickRepositoryAt,
      clickRepositoryActionAt,
      selectTab,
    },
  };
};

export type TestSubjects =
  | 'appTitle'
  | 'cell'
  | 'checkboxSelectAll'
  | 'checkboxSelectRow-aa'
  | 'deleteRepositoryConfirmation'
  | 'documentationLink'
  | 'emptyPrompt'
  | 'emptyPrompt.documentationLink'
  | 'emptyPrompt.registerRepositoryButton'
  | 'emptyPrompt.title'
  | 'registerRepositoryButton'
  | 'reloadButton'
  | 'repositoryLink'
  | 'repositoryList'
  | 'repositoryTable'
  | 'repositoryDetail'
  | 'repositoryDetail.title'
  | 'repositoryDetail.sectionLoading'
  | 'repositoryDetail.documentationLink'
  | 'repositoryDetail.repositoryType'
  | 'repositoryDetail.snapshotCount'
  | 'repositoryDetail.verifyRepositoryButton'
  | 'row'
  | 'snapshotList'
  | 'sectionLoading'
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
  | 'tableHeaderSortButton'
  | 'verifyRepositoryButton';
