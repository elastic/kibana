/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  TestBed,
  TestBedConfig,
  findTestSubject,
} from '../../../../../test_utils';
import { TemplateList } from '../../../public/application/sections/home/template_list'; // eslint-disable-line @kbn/eslint/no-restricted-paths
import { TemplateDeserialized } from '../../../common';
import { WithAppDependencies, TestSubjects } from '../helpers';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`/templates`],
    componentRoutePath: `/templates/:templateName?`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed<TestSubjects>(WithAppDependencies(TemplateList), testBedConfig);

const createActions = (testBed: TestBed<TestSubjects>) => {
  /**
   * Additional helpers
   */
  const findAction = (action: 'edit' | 'clone' | 'delete') => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    return component.find('.euiContextMenuItem').at(actions.indexOf(action));
  };

  /**
   * User Actions
   */
  const selectDetailsTab = (tab: 'summary' | 'settings' | 'mappings' | 'aliases') => {
    const tabs = ['summary', 'settings', 'mappings', 'aliases'];

    testBed.find('templateDetails.tab').at(tabs.indexOf(tab)).simulate('click');
  };

  const clickReloadButton = () => {
    const { find } = testBed;
    find('reloadButton').simulate('click');
  };

  const clickActionMenu = (templateName: TemplateDeserialized['name']) => {
    const { component } = testBed;

    // When a table has > 2 actions, EUI displays an overflow menu with an id "<template_name>-actions"
    // The template name may contain a period (.) so we use bracket syntax for selector
    act(() => {
      component.find(`div[id="${templateName}-actions"] button`).simulate('click');
    });
    component.update();
  };

  const clickTemplateAction = (
    templateName: TemplateDeserialized['name'],
    action: 'edit' | 'clone' | 'delete'
  ) => {
    const actions = ['edit', 'clone', 'delete'];
    const { component } = testBed;

    clickActionMenu(templateName);

    act(() => {
      component.find('.euiContextMenuItem').at(actions.indexOf(action)).simulate('click');
    });
    component.update();
  };

  const clickTemplateAt = async (index: number, isLegacy = false) => {
    const { component, table, router } = testBed;
    const { rows } = table.getMetaData(isLegacy ? 'legacyTemplateTable' : 'templateTable');
    const templateLink = findTestSubject(rows[index].reactWrapper, 'templateDetailsLink');

    const { href } = templateLink.props();
    await act(async () => {
      router.navigateTo(href!);
    });
    component.update();
  };

  const clickCloseDetailsButton = () => {
    const { find } = testBed;

    find('closeDetailsButton').simulate('click');
  };

  const toggleViewItem = (view: 'managed' | 'cloudManaged' | 'system') => {
    const { find, component } = testBed;
    const views = ['managed', 'cloudManaged', 'system'];

    // First open the pop over
    act(() => {
      find('viewButton').simulate('click');
    });
    component.update();

    // Then click on a filter item
    act(() => {
      find('filterList.filterItem').at(views.indexOf(view)).simulate('click');
    });
    component.update();
  };

  return {
    findAction,
    actions: {
      selectDetailsTab,
      clickReloadButton,
      clickTemplateAction,
      clickTemplateAt,
      clickCloseDetailsButton,
      clickActionMenu,
      toggleViewItem,
    },
  };
};

export const setup = async (): Promise<IndexTemplatesTabTestBed> => {
  const testBed = await initTestBed();

  return {
    ...testBed,
    ...createActions(testBed),
  };
};

export type IndexTemplatesTabTestBed = TestBed<TestSubjects> & ReturnType<typeof createActions>;
