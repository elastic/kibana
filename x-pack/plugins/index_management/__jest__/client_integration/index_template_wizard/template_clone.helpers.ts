/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBedConfig } from '../../../../../test_utils';
import { TemplateClone } from '../../../public/application/sections/template_clone'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { WithAppDependencies } from '../helpers';

import { formSetup } from './template_form.helpers';
import { TEMPLATE_NAME } from './constants';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/clone_template/${TEMPLATE_NAME}`],
    componentRoutePath: `/clone_template/:name`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(TemplateClone), testBedConfig);

export const setup = formSetup.bind(null, initTestBed);
