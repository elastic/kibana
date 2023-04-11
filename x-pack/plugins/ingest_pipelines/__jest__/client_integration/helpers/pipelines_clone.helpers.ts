/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig, TestBed } from '@kbn/test/jest';
import { HttpSetup } from 'src/core/public';
import { PipelinesClone } from '../../../public/application/sections/pipelines_clone';
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';
import { getClonePath, ROUTES } from '../../../public/application/services/navigation';

export type PipelinesCloneTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

export const PIPELINE_TO_CLONE = {
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
    initialEntries: [getClonePath({ clonedPipelineName: PIPELINE_TO_CLONE.name })],
    componentRoutePath: ROUTES.clone,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup): Promise<PipelinesCloneTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(PipelinesClone, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
