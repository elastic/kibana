/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig, TestBed } from '../../../../../test_utils';
import { BASE_PATH } from '../../../common/constants';
import { PipelinesCreate } from '../../../public/application/sections/pipelines_create'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';

export type PipelinesCreateTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/create`],
    componentRoutePath: `${BASE_PATH}/create`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(PipelinesCreate), testBedConfig);

export const setup = async (): Promise<PipelinesCreateTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
