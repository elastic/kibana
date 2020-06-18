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
import { IndexManagementHome } from '../../../public/application/sections/home'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { indexManagementStore } from '../../../public/application/store'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { WithAppDependencies, services, TestSubjects } from '../helpers';

const testBedConfig: TestBedConfig = {
  store: () => indexManagementStore(services as any),
  memoryRouter: {
    initialEntries: [`/indices`],
    componentRoutePath: `/:section(indices|data_streams)`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(IndexManagementHome), testBedConfig);

export interface DataStreamsTabTestBed extends TestBed<TestSubjects> {
  actions: {
    goToDataStreamsList: () => void;
    clickEmptyPromptIndexTemplateLink: () => void;
    clickReloadButton: () => void;
    clickNameAt: (index: number) => void;
    clickIndicesAt: (index: number) => void;
    clickDeletActionAt: (index: number) => void;
    clickConfirmDelete: () => void;
  };
  findDeleteActionAt: (index: number) => ReactWrapper;
  findDeleteConfirmationModal: () => ReactWrapper;
  findDetailPanel: () => ReactWrapper;
  findDetailPanelTitle: () => string;
}

export const setup = async (): Promise<DataStreamsTabTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const goToDataStreamsList = () => {
    testBed.find('data_streamsTab').simulate('click');
  };

  const clickEmptyPromptIndexTemplateLink = async () => {
    const { find, component, router } = testBed;

    const templateLink = find('dataStreamsEmptyPromptTemplateLink');

    await act(async () => {
      router.navigateTo(templateLink.props().href!);
    });

    component.update();
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
      clickReloadButton,
      clickNameAt,
      clickIndicesAt,
      clickDeletActionAt,
      clickConfirmDelete,
    },
    findDeleteActionAt,
    findDeleteConfirmationModal,
    findDetailPanel,
    findDetailPanelTitle,
  };
};

export const createDataStreamPayload = (name: string): DataStream => ({
  name,
  timeStampField: { name: '@timestamp', mapping: { type: 'date' } },
  indices: [
    {
      name: 'indexName',
      uuid: 'indexId',
    },
  ],
  generation: 1,
});
