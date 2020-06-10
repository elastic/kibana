/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WatchEdit } from '../../../public/application/sections/watch_edit/components/watch_edit';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { registerRouter } from '../../../public/application/lib/navigation';
import { ROUTES, WATCH_TYPES } from '../../../common/constants';
import { withAppContext } from './app_context.mock';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/new-watch/${WATCH_TYPES.THRESHOLD}`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/new-watch/:type`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(withAppContext(WatchEdit), testBedConfig);

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

export const setup = async (): Promise<WatchCreateThresholdTestBed> => {
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
  | 'watchActionAccordion.mockComboBox'
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
