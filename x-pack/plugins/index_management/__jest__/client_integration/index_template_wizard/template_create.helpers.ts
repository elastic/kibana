/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';
import { TemplateCreate } from '../../../public/application/sections/template_create';
import { WithAppDependencies } from '../helpers';

import { formSetup, TestSubjects } from './template_form.helpers';

export const setup = async (httpSetup: HttpSetup, isLegacy: boolean = false) => {
  const route = isLegacy
    ? { pathname: '/create_template', search: '?legacy=true' }
    : { pathname: '/create_template' };

  const testBedConfig: AsyncTestBedConfig = {
    memoryRouter: {
      initialEntries: [route],
      componentRoutePath: route,
    },
    doMountAsync: true,
  };

  const initTestBed = registerTestBed<TestSubjects>(
    WithAppDependencies(TemplateCreate, httpSetup),
    testBedConfig
  );

  return formSetup(initTestBed);
};
