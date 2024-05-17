/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { AsyncTestBedConfig, registerTestBed } from '@kbn/test-jest-helpers';
import { TemplateClone } from '../../../public/application/sections/template_clone';
import { WithAppDependencies } from '../helpers';

import { TEMPLATE_NAME } from './constants';
import { TestSubjects, formSetup } from './template_form.helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/clone_template/${TEMPLATE_NAME}`],
    componentRoutePath: `/clone_template/:name`,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup) => {
  const initTestBed = registerTestBed<TestSubjects>(
    WithAppDependencies(TemplateClone, httpSetup),
    testBedConfig
  );

  return formSetup(initTestBed);
};
