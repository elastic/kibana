/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';
import { HttpSetup } from 'src/core/public';

import { WatchEdit } from '../../../public/application/sections/watch_edit/components/watch_edit';
import { registerRouter } from '../../../public/application/lib/navigation';
import { ROUTES, WATCH_TYPES } from '../../../common/constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/new-watch/${WATCH_TYPES.THRESHOLD}`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/new-watch/:type`,
  },
  doMountAsync: true,
};

export interface WatchCreateThresholdTestBed extends TestBed<WatchCreateThresholdTestSubjects> {
  actions: {
    clickSubmitButton: () => void;
    clickAddActionButton: () => void;
    clickActionLink: (
      actionType: 'logging' | 'email' | 'webhook' | 'index' | 'slack' | 'jira' | 'pagerduty'
    ) => void;
    clickSimulateButton: () => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchCreateThresholdTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchEdit, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickSubmitButton = () => {
    testBed.find('saveWatchButton').simulate('click');
  };

  const clickAddActionButton = () => {
    testBed.find('addWatchActionButton').simulate('click');
  };

  const clickSimulateButton = () => {
    testBed.find('simulateActionButton').simulate('click');
  };

  const clickActionLink = (
    actionType: 'logging' | 'email' | 'webhook' | 'index' | 'slack' | 'jira' | 'pagerduty'
  ) => {
    testBed.find(`${actionType}ActionButton`).simulate('click');
  };

  return {
    ...testBed,
    actions: {
      clickSubmitButton,
      clickAddActionButton,
      clickActionLink,
      clickSimulateButton,
    },
  };
};

type WatchCreateThresholdTestSubjects = TestSubjects;

export type TestSubjects =
  | 'addWatchActionButton'
  | 'emailBodyInput'
  | 'emailSubjectInput'
  | 'indexInput'
  | 'indicesComboBox'
  | 'jiraIssueTypeInput'
  | 'jiraProjectKeyInput'
  | 'jiraSummaryInput'
  | 'loggingTextInput'
  | 'mockComboBox'
  | 'nameInput'
  | 'pagerdutyDescriptionInput'
  | 'pageTitle'
  | 'saveWatchButton'
  | 'sectionLoading'
  | 'simulateActionButton'
  | 'slackMessageTextarea'
  | 'slackRecipientComboBox'
  | 'toEmailAddressInput'
  | 'triggerIntervalSizeInput'
  | 'watchActionAccordion'
  | 'watchActionAccordion.toEmailAddressInput'
  | 'watchActionsPanel'
  | 'watchThresholdButton'
  | 'watchThresholdInput'
  | 'watchConditionTitle'
  | 'watchTimeFieldSelect'
  | 'watchVisualizationChart'
  | 'webhookBodyEditor'
  | 'webhookHostInput'
  | 'webhookPasswordInput'
  | 'webhookPathInput'
  | 'webhookPortInput'
  | 'webhookMethodSelect'
  | 'webhookSchemeSelect'
  | 'webhookUsernameInput';
