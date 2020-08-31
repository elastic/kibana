/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  findTestSubject,
  TestBed,
  TestBedConfig,
  nextTick,
} from '../../../../../test_utils';
import { SnapshotRestoreHome } from '../../../public/application/sections/home/home';
import { BASE_PATH } from '../../../public/application/constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/repositories`],
    componentRoutePath: `${BASE_PATH}/:section(repositories|snapshots)/:repositoryName?/:snapshotId*`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(SnapshotRestoreHome), testBedConfig);

export interface HomeTestBed extends TestBed<HomeTestSubjects> {
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

export const setup = async (): Promise<HomeTestBed> => {
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
      await nextTick(10);
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
      await nextTick(100);
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

type HomeTestSubjects = TestSubjects | ThreeLevelDepth | NonVisibleTestSubjects;

type NonVisibleTestSubjects =
  | 'snapshotDetail.sectionLoading'
  | 'sectionLoading'
  | 'emptyPrompt'
  | 'emptyPrompt.documentationLink'
  | 'emptyPrompt.title'
  | 'emptyPrompt.registerRepositoryButton'
  | 'repositoryDetail.sectionLoading'
  | 'snapshotDetail.indexFailure';

type ThreeLevelDepth =
  | 'snapshotDetail.uuid.value'
  | 'snapshotDetail.state.value'
  | 'snapshotDetail.version.value'
  | 'snapshotDetail.includeGlobalState.value'
  | 'snapshotDetail.indices.title'
  | 'snapshotDetail.startTime.value'
  | 'snapshotDetail.endTime.value'
  | 'snapshotDetail.indexFailure.index'
  | 'snapshotDetail.indices.value';

export type TestSubjects =
  | 'appTitle'
  | 'cell'
  | 'cell.repositoryLink'
  | 'cell.snapshotLink'
  | 'checkboxSelectAll'
  | 'checkboxSelectRow-my-repo'
  | 'closeButton'
  | 'content'
  | 'content.documentationLink'
  | 'content.duration'
  | 'content.endTime'
  | 'content.includeGlobalState'
  | 'content.indices'
  | 'content.repositoryType'
  | 'content.snapshotCount'
  | 'content.startTime'
  | 'content.state'
  | 'content.title'
  | 'content.uuid'
  | 'content.value'
  | 'content.verifyRepositoryButton'
  | 'content.version'
  | 'deleteRepositoryButton'
  | 'detailTitle'
  | 'documentationLink'
  | 'duration'
  | 'duration.title'
  | 'duration.value'
  | 'editRepositoryButton'
  | 'endTime'
  | 'endTime.title'
  | 'endTime.value'
  | 'euiFlyoutCloseButton'
  | 'includeGlobalState'
  | 'includeGlobalState.title'
  | 'includeGlobalState.value'
  | 'indices'
  | 'indices.title'
  | 'indices.value'
  | 'registerRepositoryButton'
  | 'reloadButton'
  | 'repositoryDetail'
  | 'repositoryDetail.content'
  | 'repositoryDetail.documentationLink'
  | 'repositoryDetail.euiFlyoutCloseButton'
  | 'repositoryDetail.repositoryType'
  | 'repositoryDetail.snapshotCount'
  | 'repositoryDetail.srRepositoryDetailsDeleteActionButton'
  | 'repositoryDetail.srRepositoryDetailsFlyoutCloseButton'
  | 'repositoryDetail.title'
  | 'repositoryDetail.verifyRepositoryButton'
  | 'repositoryLink'
  | 'repositoryList'
  | 'repositoryList.cell'
  | 'repositoryList.checkboxSelectAll'
  | 'repositoryList.checkboxSelectRow-my-repo'
  | 'repositoryList.content'
  | 'repositoryList.deleteRepositoryButton'
  | 'repositoryList.documentationLink'
  | 'repositoryList.editRepositoryButton'
  | 'repositoryList.euiFlyoutCloseButton'
  | 'repositoryList.registerRepositoryButton'
  | 'repositoryList.reloadButton'
  | 'repositoryList.repositoryDetail'
  | 'repositoryList.repositoryLink'
  | 'repositoryList.repositoryTable'
  | 'repositoryList.repositoryType'
  | 'repositoryList.row'
  | 'repositoryList.snapshotCount'
  | 'repositoryList.srRepositoryDetailsDeleteActionButton'
  | 'repositoryList.srRepositoryDetailsFlyoutCloseButton'
  | 'repositoryList.tableHeaderCell_name_0'
  | 'repositoryList.tableHeaderCell_type_1'
  | 'repositoryList.tableHeaderSortButton'
  | 'repositoryList.title'
  | 'repositoryList.verifyRepositoryButton'
  | 'repositoryTable'
  | 'repositoryTable.cell'
  | 'repositoryTable.checkboxSelectAll'
  | 'repositoryTable.checkboxSelectRow-my-repo'
  | 'repositoryTable.deleteRepositoryButton'
  | 'repositoryTable.editRepositoryButton'
  | 'repositoryTable.repositoryLink'
  | 'repositoryTable.row'
  | 'repositoryTable.tableHeaderCell_name_0'
  | 'repositoryTable.tableHeaderCell_type_1'
  | 'repositoryTable.tableHeaderSortButton'
  | 'repositoryType'
  | 'row'
  | 'row.cell'
  | 'row.checkboxSelectRow-my-repo'
  | 'row.deleteRepositoryButton'
  | 'row.editRepositoryButton'
  | 'row.repositoryLink'
  | 'row.snapshotLink'
  | 'snapshotCount'
  | 'snapshotDetail'
  | 'snapshotDetail.closeButton'
  | 'snapshotDetail.content'
  | 'snapshotDetail.detailTitle'
  | 'snapshotDetail.duration'
  | 'snapshotDetail.endTime'
  | 'snapshotDetail.euiFlyoutCloseButton'
  | 'snapshotDetail.includeGlobalState'
  | 'snapshotDetail.indices'
  | 'snapshotDetail.repositoryLink'
  | 'snapshotDetail.startTime'
  | 'snapshotDetail.state'
  | 'snapshotDetail.tab'
  | 'snapshotDetail.title'
  | 'snapshotDetail.uuid'
  | 'snapshotDetail.value'
  | 'snapshotDetail.version'
  | 'snapshotLink'
  | 'snapshotList'
  | 'snapshotList.cell'
  | 'snapshotList.closeButton'
  | 'snapshotList.content'
  | 'snapshotList.detailTitle'
  | 'snapshotList.duration'
  | 'snapshotList.endTime'
  | 'snapshotList.euiFlyoutCloseButton'
  | 'snapshotList.includeGlobalState'
  | 'snapshotList.indices'
  | 'snapshotList.reloadButton'
  | 'snapshotList.repositoryLink'
  | 'snapshotList.row'
  | 'snapshotList.snapshotDetail'
  | 'snapshotList.snapshotLink'
  | 'snapshotList.snapshotTable'
  | 'snapshotList.startTime'
  | 'snapshotList.state'
  | 'snapshotList.tab'
  | 'snapshotList.tableHeaderCell_durationInMillis_3'
  | 'snapshotList.tableHeaderCell_indices_4'
  | 'snapshotList.tableHeaderCell_repository_1'
  | 'snapshotList.tableHeaderCell_snapshot_0'
  | 'snapshotList.tableHeaderCell_startTimeInMillis_2'
  | 'snapshotList.tableHeaderSortButton'
  | 'snapshotList.title'
  | 'snapshotList.uuid'
  | 'snapshotList.value'
  | 'snapshotList.version'
  | 'snapshotRestoreApp'
  | 'snapshotRestoreApp.appTitle'
  | 'snapshotRestoreApp.cell'
  | 'snapshotRestoreApp.checkboxSelectAll'
  | 'snapshotRestoreApp.checkboxSelectRow-my-repo'
  | 'snapshotRestoreApp.closeButton'
  | 'snapshotRestoreApp.content'
  | 'snapshotRestoreApp.deleteRepositoryButton'
  | 'snapshotRestoreApp.detailTitle'
  | 'snapshotRestoreApp.documentationLink'
  | 'snapshotRestoreApp.duration'
  | 'snapshotRestoreApp.editRepositoryButton'
  | 'snapshotRestoreApp.endTime'
  | 'snapshotRestoreApp.euiFlyoutCloseButton'
  | 'snapshotRestoreApp.includeGlobalState'
  | 'snapshotRestoreApp.indices'
  | 'snapshotRestoreApp.registerRepositoryButton'
  | 'snapshotRestoreApp.reloadButton'
  | 'snapshotRestoreApp.repositoryDetail'
  | 'snapshotRestoreApp.repositoryLink'
  | 'snapshotRestoreApp.repositoryList'
  | 'snapshotRestoreApp.repositoryTable'
  | 'snapshotRestoreApp.repositoryType'
  | 'snapshotRestoreApp.row'
  | 'snapshotRestoreApp.snapshotCount'
  | 'snapshotRestoreApp.snapshotDetail'
  | 'snapshotRestoreApp.snapshotLink'
  | 'snapshotRestoreApp.snapshotList'
  | 'snapshotRestoreApp.snapshotTable'
  | 'snapshotRestoreApp.srRepositoryDetailsDeleteActionButton'
  | 'snapshotRestoreApp.srRepositoryDetailsFlyoutCloseButton'
  | 'snapshotRestoreApp.startTime'
  | 'snapshotRestoreApp.state'
  | 'snapshotRestoreApp.tab'
  | 'snapshotRestoreApp.tableHeaderCell_durationInMillis_3'
  | 'snapshotRestoreApp.tableHeaderCell_indices_4'
  | 'snapshotRestoreApp.tableHeaderCell_name_0'
  | 'snapshotRestoreApp.tableHeaderCell_repository_1'
  | 'snapshotRestoreApp.tableHeaderCell_snapshot_0'
  | 'snapshotRestoreApp.tableHeaderCell_startTimeInMillis_2'
  | 'snapshotRestoreApp.tableHeaderCell_type_1'
  | 'snapshotRestoreApp.tableHeaderSortButton'
  | 'snapshotRestoreApp.title'
  | 'snapshotRestoreApp.uuid'
  | 'snapshotRestoreApp.value'
  | 'snapshotRestoreApp.verifyRepositoryButton'
  | 'snapshotRestoreApp.version'
  | 'snapshotTable'
  | 'snapshotTable.cell'
  | 'snapshotTable.repositoryLink'
  | 'snapshotTable.row'
  | 'snapshotTable.snapshotLink'
  | 'snapshotTable.tableHeaderCell_durationInMillis_3'
  | 'snapshotTable.tableHeaderCell_indices_4'
  | 'snapshotTable.tableHeaderCell_repository_1'
  | 'snapshotTable.tableHeaderCell_snapshot_0'
  | 'snapshotTable.tableHeaderCell_startTimeInMillis_2'
  | 'snapshotTable.tableHeaderSortButton'
  | 'srRepositoryDetailsDeleteActionButton'
  | 'srRepositoryDetailsFlyoutCloseButton'
  | 'startTime'
  | 'startTime.title'
  | 'startTime.value'
  | 'state'
  | 'state.title'
  | 'state.value'
  | 'repositories_tab'
  | 'snapshots_tab'
  | 'policies_tab'
  | 'restore_status_tab'
  | 'tableHeaderCell_durationInMillis_3'
  | 'tableHeaderCell_durationInMillis_3.tableHeaderSortButton'
  | 'tableHeaderCell_indices_4'
  | 'tableHeaderCell_indices_4.tableHeaderSortButton'
  | 'tableHeaderCell_name_0'
  | 'tableHeaderCell_name_0.tableHeaderSortButton'
  | 'tableHeaderCell_repository_1'
  | 'tableHeaderCell_repository_1.tableHeaderSortButton'
  | 'tableHeaderCell_shards.failed_6'
  | 'tableHeaderCell_shards.total_5'
  | 'tableHeaderCell_snapshot_0'
  | 'tableHeaderCell_snapshot_0.tableHeaderSortButton'
  | 'tableHeaderCell_startTimeInMillis_2'
  | 'tableHeaderCell_startTimeInMillis_2.tableHeaderSortButton'
  | 'tableHeaderCell_type_1'
  | 'tableHeaderCell_type_1.tableHeaderSortButton'
  | 'tableHeaderSortButton'
  | 'title'
  | 'uuid'
  | 'uuid.title'
  | 'uuid.value'
  | 'value'
  | 'verifyRepositoryButton'
  | 'version'
  | 'version.title'
  | 'version.value';
