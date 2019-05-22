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
  | 'sectionLoading'
  | 'snapshotCount'
  | 'snapshotList'
  | 'snapshotList.documentationLink'
  | 'snapshotList.emptyPrompt'
  | 'snapshotList.emptyPrompt.documentationLink'
  | 'snapshotList.emptyPrompt.title'
  | 'snapshotList.title'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.appTitle'
  | 'snapshotRestoreApp.cell'
  | 'snapshotRestoreApp.cell.repositoryLink'
  | 'snapshotRestoreApp.checkboxSelectAll'
  | 'snapshotRestoreApp.checkboxSelectRow-my-repo'
  | 'snapshotRestoreApp.content'
  | 'snapshotRestoreApp.content.documentationLink'
  | 'snapshotRestoreApp.content.repositoryType'
  | 'snapshotRestoreApp.content.snapshotCount'
  | 'snapshotRestoreApp.content.verifyRepositoryButton'
  | 'snapshotRestoreApp.deleteRepositoryButton'
  | 'snapshotRestoreApp.documentationLink'
  | 'snapshotRestoreApp.editRepositoryButton'
  | 'snapshotRestoreApp.emptyPrompt'
  | 'snapshotRestoreApp.emptyPrompt.documentationLink'
  | 'snapshotRestoreApp.emptyPrompt.title'
  | 'snapshotRestoreApp.euiFlyoutCloseButton'
  | 'snapshotRestoreApp.registerRepositoryButton'
  | 'snapshotRestoreApp.reloadButton'
  | 'snapshotRestoreApp.repositoryDetail'
  | 'snapshotRestoreApp.repositoryDetail.content'
  | 'snapshotRestoreApp.repositoryDetail.content.documentationLink'
  | 'snapshotRestoreApp.repositoryDetail.content.repositoryType'
  | 'snapshotRestoreApp.repositoryDetail.content.snapshotCount'
  | 'snapshotRestoreApp.repositoryDetail.content.verifyRepositoryButton'
  | 'snapshotRestoreApp.repositoryDetail.euiFlyoutCloseButton'
  | 'snapshotRestoreApp.repositoryDetail.srRepositoryDetailsDeleteActionButton'
  | 'snapshotRestoreApp.repositoryDetail.srRepositoryDetailsFlyoutCloseButton'
  | 'snapshotRestoreApp.repositoryDetail.title'
  | 'snapshotRestoreApp.repositoryLink'
  | 'snapshotRestoreApp.repositoryList'
  | 'snapshotRestoreApp.repositoryList.registerRepositoryButton'
  | 'snapshotRestoreApp.repositoryList.reloadButton'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.content'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.content.documentationLink'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.content.repositoryType'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.content.snapshotCount'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.content.verifyRepositoryButton'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.euiFlyoutCloseButton'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.srRepositoryDetailsDeleteActionButton'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.srRepositoryDetailsFlyoutCloseButton'
  | 'snapshotRestoreApp.repositoryList.repositoryDetail.title'
  | 'snapshotRestoreApp.repositoryList.repositoryTable'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.checkboxSelectAll'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.cell'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.cell.repositoryLink'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.checkboxSelectRow-my-repo'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.deleteRepositoryButton'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.row.editRepositoryButton'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_name_0'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_type_1'
  | 'snapshotRestoreApp.repositoryList.repositoryTable.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryTable'
  | 'snapshotRestoreApp.repositoryTable.checkboxSelectAll'
  | 'snapshotRestoreApp.repositoryTable.row'
  | 'snapshotRestoreApp.repositoryTable.row.cell'
  | 'snapshotRestoreApp.repositoryTable.row.cell.repositoryLink'
  | 'snapshotRestoreApp.repositoryTable.row.checkboxSelectRow-my-repo'
  | 'snapshotRestoreApp.repositoryTable.row.deleteRepositoryButton'
  | 'snapshotRestoreApp.repositoryTable.row.editRepositoryButton'
  | 'snapshotRestoreApp.repositoryTable.tableHeaderCell_name_0'
  | 'snapshotRestoreApp.repositoryTable.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryTable.tableHeaderCell_type_1'
  | 'snapshotRestoreApp.repositoryTable.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'snapshotRestoreApp.repositoryType'
  | 'snapshotRestoreApp.row'
  | 'snapshotRestoreApp.row.cell'
  | 'snapshotRestoreApp.row.cell.repositoryLink'
  | 'snapshotRestoreApp.row.checkboxSelectRow-my-repo'
  | 'snapshotRestoreApp.row.deleteRepositoryButton'
  | 'snapshotRestoreApp.row.editRepositoryButton'
  | 'snapshotRestoreApp.snapshotCount'
  | 'snapshotRestoreApp.snapshotList'
  | 'snapshotRestoreApp.snapshotList.emptyPrompt'
  | 'snapshotRestoreApp.snapshotList.emptyPrompt.documentationLink'
  | 'snapshotRestoreApp.snapshotList.emptyPrompt.title'
  | 'snapshotRestoreApp.srRepositoryDetailsDeleteActionButton'
  | 'snapshotRestoreApp.srRepositoryDetailsFlyoutCloseButton'
  | 'snapshotRestoreApp.tab'
  | 'snapshotRestoreApp.tableHeaderCell_name_0'
  | 'snapshotRestoreApp.tableHeaderCell_name_0.tableHeaderSortButton'
  | 'snapshotRestoreApp.tableHeaderCell_type_1'
  | 'snapshotRestoreApp.tableHeaderCell_type_1.tableHeaderSortButton'
  | 'snapshotRestoreApp.tableHeaderSortButton'
  | 'snapshotRestoreApp.title'
  | 'snapshotRestoreApp.verifyRepositoryButton'
  | 'srRepositoryDetailsDeleteActionButton'
  | 'srRepositoryDetailsFlyoutCloseButton'
  | 'tab'
  | 'tableHeaderCell_name_0'
  | 'tableHeaderCell_name_0.tableHeaderSortButton'
  | 'tableHeaderCell_type_1'
  | 'tableHeaderCell_type_1.tableHeaderSortButton'
  | 'tableHeaderSortButton'
  | 'title'
  | 'verifyRepositoryButton';
