/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsyncTestBedConfig, TestBed, registerTestBed } from '@kbn/test-jest-helpers';
import { PipelinesCreate } from '../../../public/application/sections/pipelines_create';
import { ROUTES, getCreatePath } from '../../../public/application/services/navigation';
import { PipelineFormTestSubjects, getFormActions } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';

export type PipelinesCreateTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

export const setup = async (
  httpSetup: HttpSetup,
  queryParams: string = ''
): Promise<PipelinesCreateTestBed> => {
  const testBedConfig: AsyncTestBedConfig = {
    memoryRouter: {
      initialEntries: [`${getCreatePath()}${queryParams}`],
      componentRoutePath: ROUTES.create,
    },
    doMountAsync: true,
  };

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
