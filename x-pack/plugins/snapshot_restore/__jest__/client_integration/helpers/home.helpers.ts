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
  | 'cell.repositoryLink'
  | 'checkboxSelectAll'
  | 'checkboxSelectRow-my-repo'
  | 'content'
  | 'content.documentationLink'
  | 'content.repositoryType'
  | 'content.snapshotCount'
  | 'content.verifyRepositoryButton'
  | 'deleteRepositoryButton'
  | 'documentationLink'
  | 'editRepositoryButton'
  | 'emptyPrompt'
  | 'emptyPrompt.documentationLink'
  | 'emptyPrompt.registerRepositoryButton'
  | 'emptyPrompt.title'
  | 'euiFlyoutCloseButton'
  | 'registerRepositoryButton'
  | 'reloadButton'
  | 'repositoryDetail'
  | 'repositoryDetail.content'
  | 'repositoryDetail.content.documentationLink'
  | 'repositoryDetail.content.repositoryType'
  | 'repositoryDetail.content.snapshotCount'
  | 'repositoryDetail.content.verifyRepositoryButton'
  | 'repositoryDetail.documentationLink'
  | 'repositoryDetail.euiFlyoutCloseButton'
  | 'repositoryDetail.repositoryType'
  | 'repositoryDetail.snapshotCount'
  | 'repositoryDetail.srRepositoryDetailsDeleteActionButton'
  | 'repositoryDetail.srRepositoryDetailsFlyoutCloseButton'
  | 'repositoryDetail.sectionLoading'
  | 'repositoryDetail.title'
  | 'repositoryDetail.verifyRepositoryButton'
  | 'repositoryLink'
  | 'repositoryList'
  | 'repositoryList.cell'
  | 'repositoryList.cell.repositoryLink'
  | 'repositoryList.checkboxSelectAll'
  | 'repositoryList.checkboxSelectRow-my-repo'
  | 'repositoryList.content'
  | 'repositoryList.content.documentationLink'
  | 'repositoryList.content.repositoryType'
  | 'repositoryList.content.snapshotCount'
  | 'repositoryList.content.verifyRepositoryButton'
  | 'repositoryList.deleteRepositoryButton'
  | 'repositoryList.documentationLink'
  | 'repositoryList.editRepositoryButton'
  | 'repositoryList.euiFlyoutCloseButton'
  | 'repositoryList.registerRepositoryButton'
  | 'repositoryList.reloadButton'
  | 'repositoryList.repositoryDetail'
  | 'repositoryList.repositoryDetail.content'
  | 'repositoryList.repositoryDetail.content.documentationLink'
  | 'repositoryList.repositoryDetail.content.repositoryType'
  | 'repositoryList.repositoryDetail.content.snapshotCount'
  | 'repositoryList.repositoryDetail.content.verifyRepositoryButton'
  | 'repositoryList.repositoryDetail.euiFlyoutCloseButton'
  | 'repositoryList.repositoryDetail.srRepositoryDetailsDeleteActionButton'
  | 'repositoryList.repositoryDetail.srRepositoryDetailsFlyoutCloseButton'
  | 'repositoryList.repositoryDetail.title'
  | 'repositoryList.repositoryLink'
  | 'repositoryList.repositoryTable'
  | 'repositoryList.repositoryTable.checkboxSelectAll'
  | 'repositoryList.repositoryTable.row'
  | 'repositoryList.repositoryTable.row.cell'
  | 'repositoryList.repositoryTable.row.cell.repositoryLink'
  | 'repositoryList.repositoryTable.row.checkboxSelectRow-my-repo'
  | 'repositoryList.repositoryTable.row.deleteRepositoryButton'
  | 'repositoryList.repositoryTable.row.editRepositoryButton'
  | 'repositoryList.repositoryTable.tableHeaderCell_name_0'
  | 'repositoryList.repositoryTable.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'repositoryList.repositoryTable.tableHeaderCell_type_1'
  | 'repositoryList.repositoryTable.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'repositoryList.repositoryType'
  | 'repositoryList.row'
  | 'repositoryList.row.cell'
  | 'repositoryList.row.cell.repositoryLink'
  | 'repositoryList.row.checkboxSelectRow-my-repo'
  | 'repositoryList.row.deleteRepositoryButton'
  | 'repositoryList.row.editRepositoryButton'
  | 'repositoryList.snapshotCount'
  | 'repositoryList.srRepositoryDetailsDeleteActionButton'
  | 'repositoryList.srRepositoryDetailsFlyoutCloseButton'
  | 'repositoryList.tableHeaderCell_name_0'
  | 'repositoryList.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'repositoryList.tableHeaderCell_type_1'
  | 'repositoryList.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'repositoryList.tableHeaderSortButton'
  | 'repositoryList.title'
  | 'repositoryList.verifyRepositoryButton'
  | 'repositoryTable'
  | 'repositoryTable.cell'
  | 'repositoryTable.cell.repositoryLink'
  | 'repositoryTable.checkboxSelectAll'
  | 'repositoryTable.checkboxSelectRow-my-repo'
  | 'repositoryTable.deleteRepositoryButton'
  | 'repositoryTable.editRepositoryButton'
  | 'repositoryTable.repositoryLink'
  | 'repositoryTable.row'
  | 'repositoryTable.row.cell'
  | 'repositoryTable.row.cell.repositoryLink'
  | 'repositoryTable.row.checkboxSelectRow-my-repo'
  | 'repositoryTable.row.deleteRepositoryButton'
  | 'repositoryTable.row.editRepositoryButton'
  | 'repositoryTable.tableHeaderCell_name_0'
  | 'repositoryTable.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'repositoryTable.tableHeaderCell_type_1'
  | 'repositoryTable.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'repositoryTable.tableHeaderSortButton'
  | 'repositoryType'
  | 'row'
  | 'row.cell'
  | 'row.cell.repositoryLink'
  | 'row.checkboxSelectRow-my-repo'
  | 'row.deleteRepositoryButton'
  | 'row.editRepositoryButton'
  | 'row.repositoryLink'
  | 'snapshotCount'
  | 'snapshotList'
  | 'snapshotList.documentationLink'
  | 'snapshotList.emptyPrompt'
  | 'snapshotList.emptyPrompt.documentationLink'
  | 'snapshotList.emptyPrompt.title'
  | 'snapshotList.title';
