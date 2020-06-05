/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

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
    clickReloadButton: () => void;
    clickIndicesAt: (index: number) => void;
  };
}

export const setup = async (): Promise<DataStreamsTabTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const goToDataStreamsList = () => {
    testBed.find('data_streamsTab').simulate('click');
  };

  const clickReloadButton = () => {
    const { find } = testBed;
    find('reloadButton').simulate('click');
  };

  const clickIndicesAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('dataStreamTable');
    const indicesLink = findTestSubject(rows[index].reactWrapper, 'indicesLink');

    await act(async () => {
      router.navigateTo(indicesLink.props().href!);
    });

    component.update();
  };

  return {
    ...testBed,
    actions: {
      goToDataStreamsList,
      clickReloadButton,
      clickIndicesAt,
    },
  };
};

export const createDataStreamPayload = (name: string): DataStream => ({
  name,
  timeStampField: '@timestamp',
  indices: [
    {
      name: 'indexName',
      uuid: 'indexId',
    },
  ],
  generation: 1,
});
