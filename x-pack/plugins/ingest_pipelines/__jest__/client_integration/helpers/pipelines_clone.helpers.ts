/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../test_utils';
import { BASE_PATH } from '../../../common/constants';
import { PipelinesClone } from '../../../public/application/sections/pipelines_clone'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { formSetup } from './pipeline_form.helpers';
import { WithAppDependencies } from './setup_environment';

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
    initialEntries: [`${BASE_PATH}create/${PIPELINE_TO_CLONE.name}`],
    componentRoutePath: `${BASE_PATH}create/:name`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(PipelinesClone), testBedConfig);

export const setup = formSetup.bind(null, initTestBed);
