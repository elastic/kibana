/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig, TestBed } from '../../../../../test_utils';
import { PipelinesCreate } from '../../../public/application/sections/pipelines_create';
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';
import {
  INGEST_PIPELINES_PAGES,
  ROUTES_CONFIG,
  URL_GENERATOR,
} from '../../../public/application/services/navigation';

export type PipelinesCreateTestBed = TestBed<PipelineFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [URL_GENERATOR[INGEST_PIPELINES_PAGES.CREATE]()],
    componentRoutePath: ROUTES_CONFIG[INGEST_PIPELINES_PAGES.CREATE],
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
