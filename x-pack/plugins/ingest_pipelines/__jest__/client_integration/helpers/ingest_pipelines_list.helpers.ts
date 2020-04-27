/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../../../common/constants';
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
import { PipelinesList } from '../../../public/application/sections/pipelines_list';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [BASE_PATH],
    componentRoutePath: BASE_PATH,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(PipelinesList), testBedConfig);

export interface ListTestBed extends TestBed<TestSubjects> {
  actions: {
    clickReloadButton: () => void;
  };
}

export const setup = async (): Promise<ListTestBed> => {
  const testBed = await initTestBed();
  const { find } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickReloadButton,
    },
  };
};

export type TestSubjects =
  | 'appTitle'
  | 'documentationLink'
  | 'createPipelineButton'
  | 'pipelinesTable'
  | 'reloadButton';
