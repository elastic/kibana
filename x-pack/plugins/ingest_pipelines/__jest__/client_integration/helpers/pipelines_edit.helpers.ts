/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig, TestBed } from '@kbn/test-jest-helpers';
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

const initTestBed = registerTestBed(WithAppDependencies(PipelinesEdit), testBedConfig);

export const setup = async (): Promise<PipelinesEditTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
