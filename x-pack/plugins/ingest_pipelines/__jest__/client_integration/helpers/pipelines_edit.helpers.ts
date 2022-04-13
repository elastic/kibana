/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig, TestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';
import { PipelinesEdit } from '../../../public/application/sections/pipelines_edit';
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';
import { getEditPath, ROUTES } from '../../../public/application/services/navigation';

export type PipelinesEditTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

export const PIPELINE_TO_EDIT = {
  name: 'my_pipeline',
  description: 'pipeline description',
  processors: [
    {
      set: {
        field: 'foo',
        value: 'new',
      },
    },
  ],
};

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [getEditPath({ pipelineName: PIPELINE_TO_EDIT.name })],
    componentRoutePath: ROUTES.edit,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup): Promise<PipelinesEditTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(PipelinesEdit, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
