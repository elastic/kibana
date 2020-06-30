/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed, TestBed } from '../../../../../../../../../test_utils';
import { WithAppDependencies } from './setup_environment';
import { ComponentTemplateDetailsFlyout } from '../../../component_template_details';

export type ComponentTemplateDetailsTestBed = TestBed<ComponentTemplateDetailsTestSubjects> & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed<ComponentTemplateDetailsTestSubjects>) => {
  const { find } = testBed;

  /**
   * User Actions
   */
  const clickSettingsTab = () => {
    find('settingsTab').simulate('click');
  };

  const clickMappingsTab = () => {
    find('mappingsTab').simulate('click');
  };

  const clickAliasesTab = () => {
    find('aliasesTab').simulate('click');
  };

  const clickManageButton = () => {
    find('manageComponentTemplateButton').simulate('click');
  };

  return {
    clickSettingsTab,
    clickAliasesTab,
    clickMappingsTab,
    clickManageButton,
  };
};

export const setup = (props: any): ComponentTemplateDetailsTestBed => {
  const setupTestBed = registerTestBed<ComponentTemplateDetailsTestSubjects>(
    WithAppDependencies(ComponentTemplateDetailsFlyout),
    {
      memoryRouter: {
        wrapComponent: false,
      },
      defaultProps: props,
    }
  );

  const testBed = setupTestBed() as ComponentTemplateDetailsTestBed;

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};

export type ComponentTemplateDetailsTestSubjects =
  | 'componentTemplateDetails'
  | 'componentTemplateDetails.title'
  | 'componentTemplateDetails.footer'
  | 'summaryTab'
  | 'mappingsTab'
  | 'settingsTab'
  | 'aliasesTab'
  | 'sectionError'
  | 'summaryTabContent'
  | 'summaryTabContent.usedByTitle'
  | 'summaryTabContent.versionTitle'
  | 'summaryTabContent.metaTitle'
  | 'notInUseCallout'
  | 'aliasesTabContent'
  | 'noAliasesCallout'
  | 'mappingsTabContent'
  | 'noMappingsCallout'
  | 'settingsTabContent'
  | 'noSettingsCallout'
  | 'manageComponentTemplateButton'
  | 'manageComponentTemplateContextMenu'
  | 'manageComponentTemplateContextMenu.action';
