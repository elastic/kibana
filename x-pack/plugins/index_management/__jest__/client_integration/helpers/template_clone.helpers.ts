/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { BASE_PATH } from '../../../common/constants';
import { TemplateClone } from '../../../public/application/sections/template_clone'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { formSetup } from './template_form.helpers';
import { TEMPLATE_NAME } from './constants';
import { WithAppDependencies } from './setup_environment';

const { registerTestBed } = TestUtils;

const testBedConfig: TestUtils.TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}clone_template/${TEMPLATE_NAME}`],
    componentRoutePath: `${BASE_PATH}clone_template/:name`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(TemplateClone), testBedConfig);

export const setup = formSetup.bind(null, initTestBed);
