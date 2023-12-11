/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';

import { WatchEditPage } from '../../../public/application/sections/watch_edit_page';
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
    clickSubmitButton: () => Promise<void>;
    clickAddActionButton: () => Promise<void>;
    clickActionLink: (
      actionType: 'logging' | 'email' | 'webhook' | 'index' | 'slack' | 'jira' | 'pagerduty'
    ) => Promise<void>;
    clickSimulateButton: () => Promise<void>;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchCreateThresholdTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchEditPage, httpSetup), testBedConfig);
  const testBed = await initTestBed();
  const { find, component } = testBed;

  /**
   * User Actions
   */

  const clickSubmitButton = async () => {
    await act(async () => {
      find('saveWatchButton').simulate('click');
    });

    component.update();
  };

  const clickAddActionButton = async () => {
    await act(async () => {
      find('addWatchActionButton').simulate('click');
    });

    component.update();
  };

  const clickSimulateButton = async () => {
    await act(async () => {
      find('simulateActionButton').simulate('click');
    });

    component.update();
  };

  const clickActionLink = async (
    actionType: 'logging' | 'email' | 'webhook' | 'index' | 'slack' | 'jira' | 'pagerduty'
  ) => {
    await act(async () => {
      find(`${actionType}ActionButton`).simulate('click');
    });

    component.update();
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
