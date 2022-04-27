/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';

import { EuiDescriptionListDescription } from '@elastic/eui';
import {
  registerTestBed,
  TestBed,
  AsyncTestBedConfig,
  findTestSubject,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { DataStream } from '../../../common';
import { IndexManagementHome } from '../../../public/application/sections/home';
import { indexManagementStore } from '../../../public/application/store';
import { WithAppDependencies, services, TestSubjects } from '../helpers';

export interface DataStreamsTabTestBed extends TestBed<TestSubjects> {
  actions: {
    goToDataStreamsList: () => void;
    clickEmptyPromptIndexTemplateLink: () => void;
    clickIncludeStatsSwitch: () => void;
    toggleViewFilterAt: (index: number) => void;
    sortTableOnStorageSize: () => void;
    clickReloadButton: () => void;
    clickNameAt: (index: number) => void;
    clickIndicesAt: (index: number) => void;
    clickDeleteActionAt: (index: number) => void;
    selectDataStream: (name: string, selected: boolean) => void;
    clickConfirmDelete: () => void;
    clickDeleteDataStreamButton: () => void;
    clickDetailPanelIndexTemplateLink: () => void;
  };
  findDeleteActionAt: (index: number) => ReactWrapper;
  findDeleteConfirmationModal: () => ReactWrapper;
  findDetailPanel: () => ReactWrapper;
  findDetailPanelTitle: () => string;
  findEmptyPromptIndexTemplateLink: () => ReactWrapper;
  findDetailPanelIlmPolicyLink: () => ReactWrapper;
  findDetailPanelIlmPolicyName: () => ReactWrapper;
  findDetailPanelIndexTemplateLink: () => ReactWrapper;
}

export const setup = async (
  httpSetup: HttpSetup,
  overridingDependencies: any = {}
): Promise<DataStreamsTabTestBed> => {
  const testBedConfig: AsyncTestBedConfig = {
    store: () => indexManagementStore(services as any),
    memoryRouter: {
      initialEntries: [`/indices`],
      componentRoutePath: `/:section(indices|data_streams|templates)`,
    },
    doMountAsync: true,
  };

  const initTestBed = registerTestBed(
    WithAppDependencies(IndexManagementHome, httpSetup, overridingDependencies),
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

  const toggleViewFilterAt = (index: number) => {
    const { find, component } = testBed;
    act(() => {
      find('viewButton').simulate('click');
    });
    component.update();
    act(() => {
      find('filterItem').at(index).simulate('click');
    });
    component.update();
  };

  const sortTableOnStorageSize = () => {
    const { find, component } = testBed;
    act(() => {
      find('tableHeaderCell_storageSizeBytes_3.tableHeaderSortButton').simulate('click');
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

  const clickDeleteActionAt = (index: number) => {
    findDeleteActionAt(index).simulate('click');
  };

  const selectDataStream = (name: string, selected: boolean) => {
    const {
      form: { selectCheckBox },
    } = testBed;
    selectCheckBox(`checkboxSelectRow-${name}`, selected);
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

  const clickDeleteDataStreamButton = () => {
    const { find } = testBed;
    find('deleteDataStreamButton').simulate('click');
  };

  const clickDetailPanelIndexTemplateLink = async () => {
    const { component, router, find } = testBed;
    const indexTemplateLink = find('indexTemplateLink');

    await act(async () => {
      router.navigateTo(indexTemplateLink.props().href!);
    });

    component.update();
  };

  const findDetailPanel = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanel');
  };

  const findDetailPanelTitle = () => {
    const { find } = testBed;
    return find('dataStreamDetailPanelTitle').text();
  };

  const findDetailPanelIlmPolicyLink = () => {
    const { find } = testBed;
    return find('ilmPolicyLink');
  };

  const findDetailPanelIndexTemplateLink = () => {
    const { find } = testBed;
    return find('indexTemplateLink');
  };

  const findDetailPanelIlmPolicyName = () => {
    const descriptionList = testBed.component.find(EuiDescriptionListDescription);
    // ilm policy is the last in the details list
    return descriptionList.last();
  };

  return {
    ...testBed,
    actions: {
      goToDataStreamsList,
      clickEmptyPromptIndexTemplateLink,
      clickIncludeStatsSwitch,
      toggleViewFilterAt,
      sortTableOnStorageSize,
      clickReloadButton,
      clickNameAt,
      clickIndicesAt,
      clickDeleteActionAt,
      selectDataStream,
      clickConfirmDelete,
      clickDeleteDataStreamButton,
      clickDetailPanelIndexTemplateLink,
    },
    findDeleteActionAt,
    findDeleteConfirmationModal,
    findDetailPanel,
    findDetailPanelTitle,
    findEmptyPromptIndexTemplateLink,
    findDetailPanelIlmPolicyLink,
    findDetailPanelIlmPolicyName,
    findDetailPanelIndexTemplateLink,
  };
};

export const createDataStreamPayload = (dataStream: Partial<DataStream>): DataStream => ({
  name: 'my-data-stream',
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
  storageSizeBytes: 1,
  maxTimeStamp: 420,
  privileges: {
    delete_index: true,
  },
  hidden: false,
  ...dataStream,
});

export const createDataStreamBackingIndex = (indexName: string, dataStreamName: string) => ({
  health: '',
  status: '',
  primary: '',
  replica: '',
  documents: '',
  documents_deleted: '',
  size: '',
  primary_size: '',
  name: indexName,
  data_stream: dataStreamName,
});

export const createNonDataStreamIndex = (name: string) => ({
  health: 'green',
  status: 'open',
  primary: 1,
  replica: 1,
  documents: 10000,
  documents_deleted: 100,
  size: '156kb',
  primary_size: '156kb',
  name,
});
