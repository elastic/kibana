/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { registerTestBed, findTestSubject, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';

import { registerRouter } from '../../../public/application/lib/navigation';
import { WatchStatus } from '../../../public/application/sections/watch_status/components/watch_status';
import { ROUTES } from '../../../common/constants';
import { WATCH_ID } from './jest_constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/watch/${WATCH_ID}/status`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/watch/:id/status`,
  },
  doMountAsync: true,
};

export interface WatchStatusTestBed extends TestBed<WatchStatusTestSubjects> {
  actions: {
    selectTab: (tab: 'execution history' | 'action statuses') => void;
    clickToggleActivationButton: () => void;
    clickAcknowledgeButton: (index: number) => void;
    clickDeleteWatchButton: () => void;
    clickWatchExecutionAt: (index: number, tableCellText: string) => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchStatusTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchStatus, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const selectTab = (tab: 'execution history' | 'action statuses') => {
    const tabs = ['execution history', 'action statuses'];

    testBed.find('tab').at(tabs.indexOf(tab)).simulate('click');
  };

  const clickToggleActivationButton = async () => {
    const { component } = testBed;
    const button = testBed.find('toggleWatchActivationButton');

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickAcknowledgeButton = async (index: number) => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('watchActionStatusTable');
    const currentRow = rows[index];
    const lastColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(lastColumn, 'acknowledgeWatchButton');

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickDeleteWatchButton = async () => {
    const { component } = testBed;
    const button = testBed.find('deleteWatchButton');

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickWatchExecutionAt = async (index: number, tableCellText: string) => {
    const { component, table } = testBed;
    const { rows } = table.getMetaData('watchHistoryTable');
    const currentRow = rows[index];
    const firstColumn = currentRow.columns[0].reactWrapper;

    const button = findTestSubject(firstColumn, `watchStartTimeColumn-${tableCellText}`);

    await act(async () => {
      button.simulate('click');
    });
    component.update();
  };

  return {
    ...testBed,
    actions: {
      selectTab,
      clickToggleActivationButton,
      clickAcknowledgeButton,
      clickDeleteWatchButton,
      clickWatchExecutionAt,
    },
  };
};

type WatchStatusTestSubjects = TestSubjects;

export type TestSubjects =
  | 'acknowledgeWatchButton'
  | 'actionErrorsButton'
  | 'actionErrorsFlyout'
  | 'actionErrorsFlyout.errorMessage'
  | 'actionErrorsFlyout.title'
  | 'deleteWatchButton'
  | 'pageTitle'
  | 'tab'
  | 'toggleWatchActivationButton'
  | 'watchActionStatusTable'
  | 'watchActionsTable'
  | 'watchDetailSection'
  | 'watchHistoryDetailFlyout'
  | 'watchHistoryDetailFlyout.title'
  | 'watchHistorySection'
  | 'watchHistoryErrorDetailFlyout'
  | 'watchHistoryErrorDetailFlyout.errorMessage'
  | 'watchHistoryErrorDetailFlyout.title'
  | 'watchHistoryTable';
