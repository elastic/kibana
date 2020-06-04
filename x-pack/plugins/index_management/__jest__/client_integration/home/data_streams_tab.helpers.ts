/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { DataStream } from '../../../common';
// NOTE: We have to use the Home component instead of the DataStreamList component because we depend
// upon react router to provide the name of the template to load in the detail panel.
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

  return {
    ...testBed,
    actions: {
      goToDataStreamsList,
      clickReloadButton,
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
