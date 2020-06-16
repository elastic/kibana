/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { BASE_PATH } from '../../../../../../../common';
import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
  nextTick,
} from '../../../../../../../../../test_utils';
import { WithAppDependencies } from './setup_environment';
import { ComponentTemplateList } from '../../../component_template_list/component_template_list';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${BASE_PATH}component_templates`],
    componentRoutePath: `${BASE_PATH}component_templates`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WithAppDependencies(ComponentTemplateList), testBedConfig);

export type ComponentTemplateListTestBed = TestBed<ComponentTemplateTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  const { find } = testBed;

  /**
   * User Actions
   */
  const clickReloadButton = () => {
    find('reloadButton').simulate('click');
  };

  const clickComponentTemplateAt = async (index: number) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData('componentTemplatesTable');
    const componentTemplateLink = findTestSubject(
      rows[index].reactWrapper,
      'componentTemplateDetailsLink'
    );

    await act(async () => {
      const { href } = componentTemplateLink.props();
      router.navigateTo(href!);
      await nextTick();
      component.update();
    });
  };

  const clickDeleteActionAt = (index: number) => {
    const { table } = testBed;

    const { rows } = table.getMetaData('componentTemplatesTable');
    const deleteButton = findTestSubject(rows[index].reactWrapper, 'deleteComponentTemplateButton');

    deleteButton.simulate('click');
  };

  return {
    clickReloadButton,
    clickComponentTemplateAt,
    clickDeleteActionAt,
  };
};

export const setup = async (): Promise<ComponentTemplateListTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type ComponentTemplateTestSubjects =
  | 'componentTemplatesTable'
  | 'componentTemplateDetails'
  | 'componentTemplateDetails.title'
  | 'deleteComponentTemplatesConfirmation'
  | 'emptyList'
  | 'emptyList.title'
  | 'sectionLoading'
  | 'componentTemplatesLoadError'
  | 'deleteComponentTemplateButton'
  | 'reloadButton';
