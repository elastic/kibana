/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import type { HttpSetup } from '@kbn/core/public';
import { BASE_PATH } from '../../../../../../../common';
import { ComponentTemplateEdit } from '../../../component_template_wizard';

import { WithAppDependencies } from './setup_environment';
import {
  getFormActions,
  ComponentTemplateFormTestSubjects,
} from './component_template_form.helpers';

export type ComponentTemplateEditTestBed = TestBed<ComponentTemplateFormTestSubjects> & {
  actions: ReturnType<typeof getFormActions>;
  coreStart: ReturnType<typeof coreMock['createStart']>;
};

export const setup = async (
  httpSetup: HttpSetup,
  queryParams: string = ''
): Promise<ComponentTemplateEditTestBed> => {
  const testBedConfig: AsyncTestBedConfig = {
    memoryRouter: {
      initialEntries: [`${BASE_PATH}/edit_component_template/comp-1${queryParams}`],
      componentRoutePath: `${BASE_PATH}/edit_component_template/:name`,
    },
    doMountAsync: true,
  };

  const coreStart = coreMock.createStart();

  const initTestBed = registerTestBed(
    WithAppDependencies(ComponentTemplateEdit, httpSetup, coreStart),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: getFormActions(testBed),
    coreStart,
  };
};
