/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed, TestBedConfig } from '../../../../../../../../../test_utils';
import { BASE_PATH } from '../../../../../../../common';
import { ComponentTemplateCreate } from '../../../component_template_wizard';

import { WithAppDependencies } from './setup_environment';
import {
  getFormActions,
  ComponentTemplateFormTestSubjects,
} from './component_template_form.helpers';

export type ComponentTemplateCreateTestBed = TestBed<ComponentTemplateFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
};

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/create_component_template`],
    componentRoutePath: `${BASE_PATH}/create_component_template`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(ComponentTemplateCreate), testBedConfig);

export const setup = async (): Promise<ComponentTemplateCreateTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
