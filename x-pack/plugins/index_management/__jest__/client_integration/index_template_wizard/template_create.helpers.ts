/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../test_utils';
import { TemplateCreate } from '../../../public/application/sections/template_create'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { WithAppDependencies } from '../helpers';

import { formSetup, TestSubjects } from './template_form.helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/create_template`],
    componentRoutePath: `/create_template`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<TestSubjects>(
  WithAppDependencies(TemplateCreate),
  testBedConfig
);

export const setup = formSetup.bind(null, initTestBed);
