/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';
import { WithAppDependencies } from './setup_environment';
import { ComponentTemplateDetailsFlyoutContent } from '../../../component_template_details';

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

export const setup = (httpSetup: HttpSetup, props: any): ComponentTemplateDetailsTestBed => {
  const setupTestBed = registerTestBed<ComponentTemplateDetailsTestSubjects>(
    WithAppDependencies(ComponentTemplateDetailsFlyoutContent, httpSetup),
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
  | 'title'
  | 'footer'
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
