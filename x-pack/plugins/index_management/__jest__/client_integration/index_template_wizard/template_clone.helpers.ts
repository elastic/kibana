/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { TemplateClone } from '../../../public/application/sections/template_clone';
import { WithAppDependencies } from '../helpers';

import { formSetup } from './template_form.helpers';
import { TEMPLATE_NAME } from './constants';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/clone_template/${TEMPLATE_NAME}`],
    componentRoutePath: `/clone_template/:name`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(TemplateClone), testBedConfig);

export const setup: any = formSetup.bind(null, initTestBed);
