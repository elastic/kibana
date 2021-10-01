/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBedConfig } from '@kbn/test/jest';
import { TemplateCreate } from '../../../public/application/sections/template_create';
import { WithAppDependencies } from '../helpers';

import { formSetup, TestSubjects } from './template_form.helpers';

export const setup: any = (isLegacy: boolean = false) => {
  const route = isLegacy
    ? { pathname: '/create_template', search: '?legacy=true' }
    : { pathname: '/create_template' };

  const testBedConfig: TestBedConfig = {
    memoryRouter: {
      initialEntries: [route],
      componentRoutePath: route,
    },
    doMountAsync: true,
  };

  const initTestBed = registerTestBed<TestSubjects>(
    WithAppDependencies(TemplateCreate),
    testBedConfig
  );

  return formSetup.call(null, initTestBed);
};
