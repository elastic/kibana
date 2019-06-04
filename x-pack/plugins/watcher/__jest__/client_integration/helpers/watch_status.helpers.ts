/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import {
  registerTestBed,
  findTestSubject,
  TestBed,
  TestBedConfig,
} from '../../../../../test_utils';
import { WatchStatus } from '../../../public/sections/watch_status/components/watch_status';
import { ROUTES } from '../../../common/constants';
import { WATCH_ID } from './constants';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    initialEntries: [`${ROUTES.API_ROOT}/watches/watch/${WATCH_ID}/status`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/watch/:id/status`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(WatchStatus, testBedConfig);

export interface WatchStatusTestBed extends TestBed<WatchStatusTestSubjects> {
  actions: {
    clickToggleActivationButton: () => void;
    clickAcknowledgeButton: () => void;
    clickDeleteWatchButton: () => void;
    clickWatchExecutionAt: (index: number, tableCellText: string) => void;
  };
}

export const setup = async (): Promise<WatchStatusTestBed> => {
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickToggleActivationButton = async () => {
    const { component } = testBed;
    const button = testBed.find('toggleWatchActivationButton');
    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  const clickAcknowledgeButton = async () => {
    const { component } = testBed;
    const button = testBed.find('acknowledgeWatchButton');
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
    const firstColumn = currentRow.columns[currentRow.columns.length - 1].reactWrapper;
    const button = findTestSubject(firstColumn, `watchIdColumn-${tableCellText}`);

    await act(async () => {
      button.simulate('click');
      component.update();
    });
  };

  return {
    ...testBed,
    actions: {
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
  | 'toggleWatchActivationButton'
  | 'watchHistoryDetailFlyout'
  | 'watchHistoryDetailFlyout.title'
  | 'watchHistoryErrorDetailFlyout'
  | 'watchHistoryErrorDetailFlyout.errorMessage'
  | 'watchHistoryErrorDetailFlyout.title'
  | 'watchHistoryTable';
