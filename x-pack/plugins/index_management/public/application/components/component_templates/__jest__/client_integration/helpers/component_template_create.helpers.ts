/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';
import { HttpSetup } from 'src/core/public';
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

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}/create_component_template`],
    componentRoutePath: `${BASE_PATH}/create_component_template`,
  },
  doMountAsync: true,
};

export const setup = async (httpSetup: HttpSetup): Promise<ComponentTemplateCreateTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(ComponentTemplateCreate, httpSetup),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
  };
};
