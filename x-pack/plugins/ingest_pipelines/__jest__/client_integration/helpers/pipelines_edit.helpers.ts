/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { BASE_PATH } from '../../../common/constants';
import { PipelinesEdit } from '../../../public/application/sections/pipelines_edit'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { getFormActions, PipelineFormTestSubjects } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';

const { registerTestBed } = TestUtils;

export type PipelinesEditTestBed = TestUtils.TestBed<PipelineFormTestSubjects> & {
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

const testBedConfig: TestUtils.TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}edit/${PIPELINE_TO_EDIT.name}`],
    componentRoutePath: `${BASE_PATH}edit/:name`,
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
