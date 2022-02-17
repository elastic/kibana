/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { PolicyEdit } from '../../../public/application/sections/policy_edit';
import { WithAppDependencies } from './setup_environment';
import { POLICY_NAME } from './constant';
import { formSetup, PolicyFormTestSubjects } from './policy_form.helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/edit_policy/${POLICY_NAME}`],
    componentRoutePath: '/edit_policy/:name',
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<PolicyFormTestSubjects>(
  WithAppDependencies(PolicyEdit),
  testBedConfig
);

export const setup = formSetup.bind(null, initTestBed);
