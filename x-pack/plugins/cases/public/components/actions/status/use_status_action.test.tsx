/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useStatusAction } from './use_status_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';
import { CaseStatuses } from '../../../../common';

jest.mock('../../../containers/api');

describe('useStatusAction', () => {
  let appMockRender: AppMockRenderer;
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders an action', async () => {
    const { result } = renderHook(
      () =>
        useStatusAction({
          onAction,
          onActionSuccess,
          isDisabled: false,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current.getActions([basicCase])).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "cases-bulk-action-status-open",
          "disabled": true,
          "icon": "empty",
          "key": "cases-bulk-action-status-open",
          "name": "Open",
          "onClick": [Function],
        },
        Object {
          "data-test-subj": "cases-bulk-action-status-in-progress",
          "disabled": false,
          "icon": "empty",
          "key": "cases-bulk-action-status-in-progress",
          "name": "In progress",
          "onClick": [Function],
        },
        Object {
          "data-test-subj": "cases-bulk-action-status-closed",
          "disabled": false,
          "icon": "empty",
          "key": "cases-bulk-status-action",
          "name": "Closed",
          "onClick": [Function],
        },
      ]
    `);
  });

  it('update the status cases', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result, waitFor } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const actions = result.current.getActions([basicCase]);

    for (const [index, status] of [
      CaseStatuses.open,
      CaseStatuses['in-progress'],
      CaseStatuses.closed,
    ].entries()) {
      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(onAction).toHaveBeenCalled();
        expect(onActionSuccess).toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledWith(
          [{ status, id: basicCase.id, version: basicCase.version }],
          expect.anything()
        );
      });
    }
  });

  const singleCaseTests = [
    [CaseStatuses.open, 0, 'Opened "Another horrible breach!!"'],
    [CaseStatuses['in-progress'], 1, 'Marked "Another horrible breach!!" as in progress'],
    [CaseStatuses.closed, 2, 'Closed "Another horrible breach!!"'],
  ];

  it.each(singleCaseTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const { result, waitFor } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          expectedMessage
        );
      });
    }
  );

  const multipleCasesTests: Array<[CaseStatuses, number, string]> = [
    [CaseStatuses.open, 0, 'Opened 2 cases'],
    [CaseStatuses['in-progress'], 1, 'Marked 2 cases as in progress'],
    [CaseStatuses.closed, 2, 'Closed 2 cases'],
  ];

  it.each(multipleCasesTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const { result, waitFor } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase, basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          expectedMessage
        );
      });
    }
  );

  const disabledTests: Array<[CaseStatuses, number]> = [
    [CaseStatuses.open, 0],
    [CaseStatuses['in-progress'], 1],
    [CaseStatuses.closed, 2],
  ];

  it.each(disabledTests)('disables the status button correctly: %s', async (status, index) => {
    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const actions = result.current.getActions([{ ...basicCase, status }]);
    expect(actions[index].disabled).toBe(true);
  });

  it.each(disabledTests)(
    'disables the status button correctly if isDisabled=true: %s',
    async (status, index) => {
      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: true }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase]);
      expect(actions[index].disabled).toBe(true);
    }
  );
});
