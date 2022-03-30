/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import moment from 'moment';
import { getWatchHistory } from '../../__fixtures__';
import { WATCH_STATES, ACTION_STATES } from '../../common/constants';
import { setupEnvironment, pageHelpers } from './helpers';
import { WatchStatusTestBed } from './helpers/watch_status.helpers';
import { WATCH, WATCH_ID } from './helpers/jest_constants';
import { API_BASE_PATH } from '../../common/constants';

const { setup } = pageHelpers.watchStatus;

const watchHistory1 = getWatchHistory({ startTime: '2019-06-04T01:11:11.294' });
const watchHistory2 = getWatchHistory({ startTime: '2019-06-04T01:10:10.987Z' });

const watchHistoryItems = { watchHistoryItems: [watchHistory1, watchHistory2] };

const ACTION_ID = 'my_logging_action_1';

const watch = {
  ...WATCH.watch,
  watchStatus: {
    state: WATCH_STATES.FIRING,
    isActive: true,
    actionStatuses: [
      {
        id: ACTION_ID,
        state: ACTION_STATES.FIRING,
        isAckable: true,
      },
    ],
  },
};

describe('<WatchStatus />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();
  let testBed: WatchStatusTestBed;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('on component mount', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadWatchResponse(WATCH_ID, { watch });
      httpRequestsMockHelpers.setLoadWatchHistoryResponse(WATCH_ID, watchHistoryItems);

      testBed = await setup(httpSetup);
      testBed.component.update();
    });

    test('should set the correct page title', () => {
      const { find } = testBed;

      expect(find('pageTitle').text()).toBe(`Current status for '${watch.name}'`);
    });

    describe('tabs', () => {
      test('should have 2 tabs', () => {
        const { find } = testBed;

        expect(find('tab').length).toBe(2);
        expect(find('tab').map((t) => t.text())).toEqual(['Execution history', 'Action statuses']);
      });

      test('should navigate to the "Action statuses" tab', () => {
        const { exists, actions } = testBed;

        expect(exists('watchHistorySection')).toBe(true);
        expect(exists('watchDetailSection')).toBe(false);

        actions.selectTab('action statuses');

        expect(exists('watchHistorySection')).toBe(false);
        expect(exists('watchDetailSection')).toBe(true);
      });
    });

    describe('execution history', () => {
      test('should list history items in the table', () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('watchHistoryTable');

        const getExpectedValue = (value: any) => (typeof value === 'undefined' ? '' : value);

        tableCellsValues.forEach((row, i) => {
          const historyItem = watchHistoryItems.watchHistoryItems[i];
          const { startTime, watchStatus } = historyItem;

          expect(row).toEqual([
            getExpectedValue(moment(startTime).format()),
            getExpectedValue(watchStatus.state),
            getExpectedValue(watchStatus.comment),
          ]);
        });
      });

      test('should show execution history details on click', async () => {
        const { actions, exists } = testBed;

        const watchHistoryItem = {
          ...watchHistory1,
          watchId: watch.id,
          watchStatus: {
            state: WATCH_STATES.FIRING,
            actionStatuses: [
              {
                id: 'my_logging_action_1',
                state: ACTION_STATES.FIRING,
                isAckable: true,
              },
            ],
          },
        };

        const formattedStartTime = moment(watchHistoryItem.startTime).format();

        httpRequestsMockHelpers.setLoadWatchHistoryItemResponse(WATCH_ID, { watchHistoryItem });

        await actions.clickWatchExecutionAt(0, formattedStartTime);

        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/history/${watchHistoryItem.id}`,
          expect.anything()
        );

        expect(exists('watchHistoryDetailFlyout')).toBe(true);
      });
    });

    describe('delete watch', () => {
      test('should show a confirmation when clicking the delete button', async () => {
        const { actions } = testBed;

        await actions.clickDeleteWatchButton();

        // We need to read the document "body" as the modal is added there and not inside
        // the component DOM tree.
        expect(
          document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')
        ).not.toBe(null);

        expect(
          document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]')!.textContent
        ).toContain('Delete watch');
      });

      test('should send the correct HTTP request to delete watch', async () => {
        const { component, actions } = testBed;

        await actions.clickDeleteWatchButton();

        const modal = document.body.querySelector('[data-test-subj="deleteWatchesConfirmation"]');
        const confirmButton: HTMLButtonElement | null = modal!.querySelector(
          '[data-test-subj="confirmModalConfirmButton"]'
        );

        httpRequestsMockHelpers.setDeleteWatchResponse({
          results: {
            successes: [watch.id],
            errors: [],
          },
        });

        await act(async () => {
          confirmButton!.click();
        });
        component.update();

        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watches/delete`,
          expect.anything()
        );
      });
    });

    describe('activate & deactive watch', () => {
      test('should send the correct HTTP request to deactivate and activate a watch', async () => {
        const { actions } = testBed;

        httpRequestsMockHelpers.setDeactivateWatchResponse(WATCH_ID, {
          watchStatus: {
            state: WATCH_STATES.DISABLED,
            isActive: false,
          },
        });

        await actions.clickToggleActivationButton();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watch/${watch.id}/deactivate`,
          expect.anything()
        );

        httpRequestsMockHelpers.setActivateWatchResponse(WATCH_ID, {
          watchStatus: {
            state: WATCH_STATES.FIRING,
            isActive: true,
          },
        });

        await actions.clickToggleActivationButton();

        expect(httpSetup.put).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/watch/${watch.id}/activate`,
          expect.anything()
        );
      });
    });

    describe('action statuses', () => {
      beforeEach(() => {
        const { actions } = testBed;

        actions.selectTab('action statuses');
      });

      test('should list the watch actions in a table', () => {
        const { table } = testBed;
        const { tableCellsValues } = table.getMetaData('watchActionStatusTable');

        tableCellsValues.forEach((row, i) => {
          const action = watch.watchStatus.actionStatuses[i];
          const { id, state, isAckable } = action;

          expect(row).toEqual([id, state, isAckable ? 'Acknowledge' : '']);
        });
      });

      test('should allow an action to be acknowledged', async () => {
        const { actions, table } = testBed;

        httpRequestsMockHelpers.setAcknowledgeWatchResponse(WATCH_ID, ACTION_ID, {
          watchStatus: {
            state: WATCH_STATES.FIRING,
            isActive: true,
            comment: 'Acked',
            actionStatuses: [
              {
                id: ACTION_ID,
                state: ACTION_STATES.ACKNOWLEDGED,
                isAckable: false,
              },
            ],
          },
        });

        await actions.clickAcknowledgeButton(0);

        expect(httpSetup.put).toHaveBeenNthCalledWith(
          3,
          `${API_BASE_PATH}/watch/${watch.id}/action/${ACTION_ID}/acknowledge`
        );

        const { tableCellsValues } = table.getMetaData('watchActionStatusTable');

        tableCellsValues.forEach((row) => {
          expect(row).toEqual([ACTION_ID, ACTION_STATES.ACKNOWLEDGED, '']);
        });
      });
    });
  });
});
