/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
} from '../../../../../test_utils';
import { DataStream } from '../../../common';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

export interface DataStreamsTabTestBed extends TestBed<TestSubjects> {
  actions: {
    goToDataStreamsList: () => void;
    clickEmptyPromptIndexTemplateLink: () => void;
    clickIncludeStatsSwitch: () => void;
    clickReloadButton: () => void;
    clickNameAt: (index: number) => void;
    clickIndicesAt: (index: number) => void;
    clickDeletActionAt: (index: number) => void;
    clickConfirmDelete: () => void;
    clickDeletDataStreamButton: () => void;
  };
  findDeleteActionAt: (index: number) => ReactWrapper;
  findDeleteConfirmationModal: () => ReactWrapper;
  findDetailPanel: () => ReactWrapper;
  findDetailPanelTitle: () => string;
  findEmptyPromptIndexTemplateLink: () => ReactWrapper;
}

export const setup = async (overridingDependencies: any = {}): Promise<DataStreamsTabTestBed> => {
  const testBedConfig: TestBedConfig = {
    store: () => indexManagementStore(services as any),
    memoryRouter: {
      initialEntries: [`/indices`],
      componentRoutePath: `/:section(indices|data_streams|templates)`,
    },
    doMountAsync: true,
  };

  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, overridingDependencies),
    testBedConfig
  );
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const goToDataStreamsList = () => {
    testBed.find('data_streamsTab').simulate('click');
  };

  const findEmptyPromptIndexTemplateLink = () => {
    const { find } = testBed;
    const templateLink = find('dataStreamsEmptyPromptTemplateLink');
    return templateLink;
  };

  const clickEmptyPromptIndexTemplateLink = async () => {
    const { component, router } = testBed;
    await act(async () => {
      router.navigateTo(findEmptyPromptIndexTemplateLink().props().href!);
    });
    component.update();
  };

  const clickIncludeStatsSwitch = () => {
    const { find } = testBed;
    find('includeStatsSwitch').simulate('click');
  };

  const clickReloadButton = () => {
    const { find } = testBed;
    find('reloadButton').simulate('click');
  };

  const findTestSubjectAt = (testSubject: string, index: number) => {
    const { table } = testBed;
    const { rows } = table.getMetaData('dataStreamTable');
    return findTestSubject(rows[index].reactWrapper, testSubject);
  };

  const clickIndicesAt = async (index: number) => {
    const { component, router } = testBed;
    const indicesLink = findTestSubjectAt('indicesLink', index);

    await act(async () => {
      router.navigateTo(indicesLink.props().href!);
    });

    component.update();
  };

  const clickNameAt = async (index: number) => {
    const { component, router } = testBed;
    const nameLink = findTestSubjectAt('nameLink', index);

    await act(async () => {
      router.navigateTo(nameLink.props().href!);
    });

    component.update();
  };

  const findDeleteActionAt = findTestSubjectAt.bind(null, 'deleteDataStream');

  const clickDeletActionAt = (index: number) => {
    findDeleteActionAt(index).simulate('click');
  };

  const findDeleteConfirmationModal = () => {
    const { find } = testBed;
    return find('deleteDataStreamsConfirmation');
  };

  const clickConfirmDelete = async () => {
    const modal = document.body.querySelector('[data-test-subj="deleteDataStreamsConfirmation"]');
    const confirmButton: HTMLButtonElement | null = modal!.querySelector(
      '[data-test-subj="confirmModalConfirmButton"]'
    );

    await act(async () => {
      confirmButton!.click();
    });
  };

  const clickDeletDataStreamButton = () => {
    const { find } = testBed;
    find('deleteDataStreamButton').simulate('click');
  };

  const findDetailPanel = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanel');
  };

  const findDetailPanelTitle = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanelTitle').text();
  };

  return {
    ...testBed,
    actions: {
      goToDataStreamsList,
      clickEmptyPromptIndexTemplateLink,
      clickIncludeStatsSwitch,
      clickReloadButton,
      clickNameAt,
      clickIndicesAt,
      clickDeletActionAt,
      clickConfirmDelete,
      clickDeletDataStreamButton,
    },
    findDeleteActionAt,
    findDeleteConfirmationModal,
    findDetailPanel,
    findDetailPanelTitle,
    findEmptyPromptIndexTemplateLink,
  };
};

export const createDataStreamPayload = (name: string): DataStream => ({
  name,
  timeStampField: { name: '@timestamp' },
  indices: [
    {
      name: 'indexName',
      uuid: 'indexId',
    },
  ],
  generation: 1,
  health: 'green',
  indexTemplateName: 'indexTemplate',
  storageSize: '1b',
  maxTimeStamp: 420,
});
