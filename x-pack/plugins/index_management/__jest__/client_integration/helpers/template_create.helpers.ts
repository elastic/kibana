/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { BASE_PATH } from '../../../common/constants';
import { TemplateCreate } from '../../../public/application/sections/template_create'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { formSetup, TestSubjects } from './template_form.helpers';
import { WithAppDependencies } from './setup_environment';

const { registerTestBed } = TestUtils;

const testBedConfig: TestUtils.TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}create_template`],
    componentRoutePath: `${BASE_PATH}create_template`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<TestSubjects>(
  WithAppDependencies(TemplateCreate),
  testBedConfig
);

export const setup = formSetup.bind(null, initTestBed);
