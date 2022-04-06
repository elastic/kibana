/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig, TestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';
import { PipelinesCreate } from '../../../public/application/sections/pipelines_create';
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';
import { getCreatePath, ROUTES } from '../../../public/application/services/navigation';

export type PipelinesCreateTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [getCreatePath()],
    componentRoutePath: ROUTES.create,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup): Promise<PipelinesCreateTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(PipelinesCreate, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
