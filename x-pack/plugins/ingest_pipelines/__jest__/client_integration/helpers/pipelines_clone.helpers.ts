/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig, TestBed } from '../../../../../test_utils';
import { PipelinesClone } from '../../../public/application/sections/pipelines_clone';
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';
import {
  INGEST_PIPELINES_PAGES,
  ROUTES_CONFIG,
  URL_GENERATOR,
} from '../../../public/application/services/navigation';

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

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [URL_GENERATOR[INGEST_PIPELINES_PAGES.CLONE](PIPELINE_TO_CLONE.name)],
    componentRoutePath: ROUTES_CONFIG[INGEST_PIPELINES_PAGES.CLONE],
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(PipelinesClone), testBedConfig);

export const setup = async (): Promise<PipelinesCloneTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
